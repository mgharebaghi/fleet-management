import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManageLocations, normalizeLocation } from "./manage-locations";
import type {
  LocationRepository,
  LocationWriteSession,
} from "./location-repository";

const location = {
  locationId: 1,
  locationCode: "HQ",
  locationName: "دفتر مرکزی",
  locationType: "اداری",
  address: "تهران",
  isActive: true,
};

const session = {
  duplicateCandidates: vi.fn(),
  create: vi.fn(),
} satisfies LocationWriteSession;
const repository = {
  atomic: async <T>(work: (value: LocationWriteSession) => Promise<T>) =>
    work(session),
} satisfies LocationRepository;
const manage = new ManageLocations(repository);

beforeEach(() => {
  vi.resetAllMocks();
  session.duplicateCandidates.mockResolvedValue([]);
  session.create.mockResolvedValue(location);
});

describe("Location normalization and validation", () => {
  it("normalizes whitespace, Arabic variants, code and coordinate digits", () => {
    expect(
      normalizeLocation({
        locationName: "  دفتر   مركزي ",
        locationCode: " hq ",
        locationType: " اداري ",
        address: "  تهران   مركزي ",
        latitude: "۳۵٫۱۲۳۴۵۶",
        longitude: "٥١.٤٢",
        description: " ",
      }),
    ).toEqual({
      locationName: "دفتر مرکزی",
      locationCode: "HQ",
      locationType: "اداری",
      address: "تهران مرکزی",
      latitude: "35.123456",
      longitude: "51.42",
      description: null,
    });
  });

  it.each([
    [{ locationName: " " }, "LOCATION_NAME_REQUIRED"],
    [{ locationName: "x".repeat(201) }, "LOCATION_NAME_TOO_LONG"],
    [{ locationCode: "x".repeat(51) }, "LOCATION_CODE_TOO_LONG"],
    [{ locationType: "x".repeat(101) }, "LOCATION_TYPE_TOO_LONG"],
    [{ latitude: "90.000001" }, "INVALID_LATITUDE"],
    [{ latitude: "1.1234567" }, "INVALID_LATITUDE"],
    [{ longitude: "-180.000001" }, "INVALID_LONGITUDE"],
  ] as const)("rejects invalid DB-bound value %o", async (change, error) => {
    expect(
      await manage.create({
        locationName: "مکان",
        locationCode: null,
        locationType: null,
        address: null,
        latitude: null,
        longitude: null,
        description: null,
        ...change,
      }),
    ).toEqual({ success: false, error, similarLocations: [] });
    expect(session.create).not.toHaveBeenCalled();
  });
});

describe("Location duplicate checks", () => {
  const candidate = {
    ...location,
    normalizedCode: "HQ",
    normalizedName: "دفتر مرکزی",
    normalizedAddress: "تهران",
  };

  it("treats normalized exact nonempty code as a strong duplicate", async () => {
    session.duplicateCandidates.mockResolvedValue([candidate]);
    expect(
      await manage.create({
        locationName: "نام دیگر",
        locationCode: " hq ",
        locationType: null,
        address: null,
        latitude: null,
        longitude: null,
        description: null,
      }),
    ).toEqual({
      success: false,
      error: "LOCATION_CODE_DUPLICATE",
      similarLocations: [location],
    });
  });

  it("prevents normalized exact name and address duplicates", async () => {
    session.duplicateCandidates.mockResolvedValue([candidate]);
    expect(
      await manage.create({
        locationName: "دفتر  مركزي",
        locationCode: null,
        locationType: null,
        address: " تهران ",
        latitude: null,
        longitude: null,
        description: null,
      }),
    ).toMatchObject({
      success: false,
      error: "LOCATION_NAME_ADDRESS_DUPLICATE",
    });
  });

  it("reports an inactive exact duplicate distinctly", async () => {
    session.duplicateCandidates.mockResolvedValue([
      { ...candidate, isActive: false },
    ]);
    expect(
      await manage.create({
        locationName: "دفتر مرکزی",
        locationCode: null,
        locationType: null,
        address: "تهران",
        latitude: null,
        longitude: null,
        description: null,
      }),
    ).toMatchObject({
      success: false,
      error: "LOCATION_INACTIVE_DUPLICATE",
    });
  });

  it("creates a normalized location and returns similar names", async () => {
    session.duplicateCandidates.mockResolvedValue([
      {
        ...candidate,
        locationId: 2,
        locationName: "دفتر مرکزی شرق",
        locationCode: "HQ-E",
        normalizedCode: "HQ-E",
        normalizedName: "دفتر مرکزی شرق",
      },
    ]);
    const result = await manage.create({
      locationName: " دفتر مرکزی ",
      locationCode: " HQ-W ",
      locationType: null,
      address: " غرب ",
      latitude: "35",
      longitude: "51",
      description: null,
    });
    expect(result).toEqual({
      success: true,
      location,
      similarLocations: [
        expect.objectContaining({ locationId: 2 }),
      ],
    });
    expect(session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        locationName: "دفتر مرکزی",
        locationCode: "HQ-W",
        address: "غرب",
      }),
    );
  });
});
