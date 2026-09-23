import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TripLocationReference } from "../../application/trip-records";
import { RoutePlanMap } from "./route-plan-map";
import {
  ROUTE_PLAN_MISSING_ENDPOINT_MESSAGE,
  ROUTE_PLAN_MISSING_INTERMEDIATE_MESSAGE,
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

describe("RoutePlanMap", () => {
  it("stays compact when an endpoint has no coordinates and draws no route line", () => {
    const markup = renderToStaticMarkup(
      <RoutePlanMap
        mapKey={null}
        origin={location({
          locationId: 1,
          locationName: "دفتر مرکزی",
          latitude: "35.721989",
          longitude: "51.334695",
        })}
        destination={location({
          locationId: 4,
          locationName: "کارخانه",
        })}
        intermediates={[]}
      />,
    );

    expect(markup).toContain(ROUTE_PLAN_MISSING_ENDPOINT_MESSAGE);
    expect(markup).not.toContain("در حال بارگذاری نقشه");
    expect(markup).not.toContain("<polyline");
  });

  it("explains a coordinate-less intermediate without calling the map canvas", () => {
    const markup = renderToStaticMarkup(
      <RoutePlanMap
        mapKey="public-map-key"
        origin={location({
          locationId: 1,
          locationName: "دفتر",
          latitude: "35.721989",
          longitude: "51.334695",
        })}
        destination={location({
          locationId: 2,
          locationName: "کارخانه",
          latitude: "35.689200",
          longitude: "51.389000",
        })}
        intermediates={[
          { location: location({ locationId: 3, locationName: "قم" }) },
        ]}
      />,
    );

    expect(markup).toContain(ROUTE_PLAN_MISSING_INTERMEDIATE_MESSAGE);
    expect(markup).not.toContain("<polyline");
  });
});
