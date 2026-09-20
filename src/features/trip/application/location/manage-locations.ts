import type { LocationRepository } from "./location-repository";
import type { TripLocationReference } from "../trip-records";
import type {
  CreateLocationCommand,
  CreateLocationResult,
  LocationDuplicateCandidate,
  LocationFailure,
} from "./location-records";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeLocationText(value: string): string {
  return value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value === null ? "" : normalizeLocationText(value);
  return normalized || null;
}

export function normalizeLocationCode(value: string | null): string | null {
  return normalizeOptionalText(value)?.toUpperCase() ?? null;
}

function normalizeCoordinate(value: string | null): string | null {
  const normalized = value
    ?.trim()
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace("٫", ".");
  return normalized || null;
}

function coordinateIsValid(
  value: string | null,
  minimum: number,
  maximum: number,
): boolean {
  if (value === null) return true;
  if (!/^-?(?:0|[1-9]\d{0,2})(?:\.\d{1,6})?$/.test(value)) return false;
  const numeric = Number(value);
  return numeric >= minimum && numeric <= maximum;
}

export function normalizeLocation(
  input: CreateLocationCommand,
): CreateLocationCommand {
  return {
    locationName: normalizeLocationText(input.locationName),
    locationCode: normalizeLocationCode(input.locationCode),
    locationType: normalizeOptionalText(input.locationType),
    address: normalizeOptionalText(input.address),
    latitude: normalizeCoordinate(input.latitude),
    longitude: normalizeCoordinate(input.longitude),
    description: normalizeOptionalText(input.description),
  };
}

export function locationValidationError(
  input: CreateLocationCommand,
): LocationFailure | null {
  if (!input.locationName) return "LOCATION_NAME_REQUIRED";
  if (input.locationName.length > 200) return "LOCATION_NAME_TOO_LONG";
  if ((input.locationCode?.length ?? 0) > 50) {
    return "LOCATION_CODE_TOO_LONG";
  }
  if ((input.locationType?.length ?? 0) > 100) {
    return "LOCATION_TYPE_TOO_LONG";
  }
  if (!coordinateIsValid(input.latitude, -90, 90)) {
    return "INVALID_LATITUDE";
  }
  if (!coordinateIsValid(input.longitude, -180, 180)) {
    return "INVALID_LONGITUDE";
  }
  return null;
}

const failure = (
  error: LocationFailure,
  similarLocations: TripLocationReference[],
): CreateLocationResult => ({ success: false, error, similarLocations });

function toReference(candidate: LocationDuplicateCandidate) {
  return {
    locationId: candidate.locationId,
    locationCode: candidate.locationCode,
    locationName: candidate.locationName,
    locationType: candidate.locationType,
    address: candidate.address,
    isActive: candidate.isActive,
  };
}

export class ManageLocations {
  constructor(private readonly repository: LocationRepository) {}

  async create(input: CreateLocationCommand): Promise<CreateLocationResult> {
    const value = normalizeLocation(input);
    const error = locationValidationError(value);
    if (error) return failure(error, []);

    return this.repository.atomic(async (session) => {
      const candidates = await session.duplicateCandidates();
      const exactCode =
        value.locationCode === null
          ? null
          : candidates.find(
              (candidate) => candidate.normalizedCode === value.locationCode,
            );
      const exactNameAddress = candidates.find(
        (candidate) =>
          candidate.normalizedName === value.locationName &&
          candidate.normalizedAddress === value.address,
      );
      const exact = exactCode ?? exactNameAddress;
      if (exact?.isActive === false) {
        return failure("LOCATION_INACTIVE_DUPLICATE", [toReference(exact)]);
      }
      if (exactCode) {
        return failure("LOCATION_CODE_DUPLICATE", [
          toReference(exactCode),
        ]);
      }
      if (exactNameAddress) {
        return failure("LOCATION_NAME_ADDRESS_DUPLICATE", [
          toReference(exactNameAddress),
        ]);
      }

      const similarLocations = candidates
        .filter(
          (candidate) =>
            candidate.normalizedName.includes(value.locationName) ||
            value.locationName.includes(candidate.normalizedName),
        )
        .slice(0, 5)
        .map(toReference);
      const location = await session.create(value);
      return {
        success: true,
        location,
        ...(similarLocations.length > 0 ? { similarLocations } : {}),
      };
    });
  }
}
