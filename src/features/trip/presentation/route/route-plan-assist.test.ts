import { describe, expect, it } from "vitest";

import type { TripLocationReference } from "../../application/trip-records";
import type { MapRoute } from "../../../../maps/map-route";
import {
  acceptAssistedSuggestion,
  assistedFieldFromSaved,
  editAssistedValue,
  emptyAssistedField,
  proposeAssistedValue,
  readinessForLocations,
  routeCoordinateKey,
  sequenceNumbers,
  suggestPointDistances,
} from "./route-plan-assist";

function location(
  partial: Pick<TripLocationReference, "locationId" | "locationName"> &
    Partial<TripLocationReference>,
): TripLocationReference {
  return {
    locationCode: null,
    locationType: null,
    address: null,
    latitude: null,
    longitude: null,
    isActive: true,
    ...partial,
  };
}

const origin = location({
  locationId: 1,
  locationName: "دفتر",
  latitude: "35.721989",
  longitude: "51.334695",
});
const destination = location({
  locationId: 2,
  locationName: "کارخانه",
  latitude: "35.689200",
  longitude: "51.389000",
});

const route: MapRoute = {
  path: [origin as never, destination as never].map(() => ({
    latitude: "35.700000",
    longitude: "51.400000",
  })),
  distanceKm: "65",
  durationMinute: 70,
  legDistanceKm: ["40", "25", "10"],
};

describe("route planning assistance", () => {
  it("routes origin, intermediates, and destination in that order", () => {
    const middle = location({
      locationId: 3,
      locationName: "میدان",
      latitude: "35.699722",
      longitude: "51.338056",
    });
    const readiness = readinessForLocations({
      origin,
      destination,
      intermediates: [{ location: middle }],
    });
    expect(readiness.status).toBe("ready");
    if (readiness.status !== "ready") return;
    expect(routeCoordinateKey(readiness.coordinates)).toBe(
      "35.721989,51.334695|35.699722,51.338056|35.689200,51.389000",
    );
    expect(sequenceNumbers(3)).toEqual(["1", "2", "3"]);
  });

  it("does not route when an endpoint or intermediate has no coordinates", () => {
    expect(
      readinessForLocations({
        origin: location({ locationId: 1, locationName: "سازمان" }),
        destination,
        intermediates: [],
      }).status,
    ).toBe("missing-endpoint");
    expect(
      readinessForLocations({
        origin,
        destination,
        intermediates: [
          { location: location({ locationId: 9, locationName: "قم" }) },
        ],
      }).status,
    ).toBe("missing-intermediate");
    expect(
      readinessForLocations({
        origin,
        destination,
        intermediates: [{ location: null }],
      }).status,
    ).toBe("incomplete-point");
  });

  it("fills an empty field from the provider and keeps a later manual edit", () => {
    const filled = proposeAssistedValue(emptyAssistedField(), "65");
    expect(filled).toEqual({ value: "65", edited: false, suggestion: null });
    const edited = editAssistedValue(filled, "70");
    const recalculated = proposeAssistedValue(edited, "80");
    expect(recalculated.value).toBe("70");
    expect(recalculated.edited).toBe(true);
    expect(recalculated.suggestion).toBe("80");
    expect(acceptAssistedSuggestion(recalculated)).toEqual({
      value: "80",
      edited: true,
      suggestion: null,
    });
  });

  it("does not replace a distance that was already saved", () => {
    const saved = assistedFieldFromSaved("18.5");
    expect(proposeAssistedValue(saved, "65").value).toBe("18.5");
    expect(proposeAssistedValue(saved, "65").suggestion).toBe("65");
  });

  it("suggests cumulative point distances without overwriting an edited point", () => {
    const fields = [
      emptyAssistedField(),
      editAssistedValue(emptyAssistedField(), "10"),
    ];
    const next = suggestPointDistances(fields, route);
    expect(next?.[0]).toEqual({ value: "40", edited: false, suggestion: null });
    expect(next?.[1]?.value).toBe("10");
    expect(next?.[1]?.suggestion).toBe("65");
  });

  it("uses the same coordinate key to recognize an unchanged path", () => {
    const readiness = readinessForLocations({
      origin,
      destination,
      intermediates: [],
    });
    if (readiness.status !== "ready") throw new Error("expected a routable path");
    expect(routeCoordinateKey(readiness.coordinates)).toBe(
      routeCoordinateKey([...readiness.coordinates]),
    );
  });
});
