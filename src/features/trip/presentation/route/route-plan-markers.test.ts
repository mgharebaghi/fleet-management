import { describe, expect, it } from "vitest";

import type { TripLocationReference } from "../../application/trip-records";
import {
  ROUTE_PLAN_DESTINATION_LABEL,
  ROUTE_PLAN_ORIGIN_LABEL,
  routePlanMarkers,
  routePlanStops,
} from "./route-plan-markers";

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
  locationName: "دفتر مرکزی",
  latitude: "35.721989",
  longitude: "51.334695",
});
const firstStop = location({
  locationId: 2,
  locationName: "میدان آزادی",
  latitude: "35.699722",
  longitude: "51.338056",
});
const unmappedStop = location({
  locationId: 3,
  locationName: "انبار بدون مختصات",
});
const destination = location({
  locationId: 4,
  locationName: "کارخانه",
  latitude: "35.689200",
  longitude: "51.389000",
});

describe("route plan markers", () => {
  const stops = routePlanStops({
    origin,
    destination,
    intermediates: [
      { location: firstStop },
      { location: unmappedStop },
      { location: null },
    ],
  });

  it("orders origin, intermediate points, and destination with restrained labels", () => {
    expect(stops.map((stop) => [stop.role, stop.label, stop.locationName])).toEqual([
      ["origin", ROUTE_PLAN_ORIGIN_LABEL, "دفتر مرکزی"],
      ["intermediate", "۱", "میدان آزادی"],
      ["intermediate", "۲", "انبار بدون مختصات"],
      ["intermediate", "۳", "مکان انتخاب‌نشده"],
      ["destination", ROUTE_PLAN_DESTINATION_LABEL, "کارخانه"],
    ]);
  });

  it("omits locations without coordinates from markers and keeps them in the stop list", () => {
    const markers = routePlanMarkers(stops);
    expect(markers.map((marker) => marker.id)).toEqual([
      "origin",
      "intermediate-0",
      "destination",
    ]);
    expect(markers.map((marker) => marker.label)).toEqual([
      "مبدأ، دفتر مرکزی",
      "۱، میدان آزادی",
      "مقصد، کارخانه",
    ]);
    expect(stops.find((stop) => stop.id === "intermediate-1")?.hasLocation).toBe(
      true,
    );
    expect(stops.find((stop) => stop.id === "intermediate-1")?.coordinate).toBe(
      null,
    );
  });

  it("does not treat origin or destination as intermediate points", () => {
    expect(
      stops
        .filter((stop) => stop.role === "intermediate")
        .map((stop) => stop.locationName),
    ).toEqual(["میدان آزادی", "انبار بدون مختصات", "مکان انتخاب‌نشده"]);
  });

  it("marks only the focused pin when one stop is chosen", () => {
    const markers = routePlanMarkers(stops, "destination");
    expect(markers.find((marker) => marker.id === "destination")?.selected).toBe(
      true,
    );
    expect(markers.find((marker) => marker.id === "origin")?.selected).toBe(
      false,
    );
  });
});
