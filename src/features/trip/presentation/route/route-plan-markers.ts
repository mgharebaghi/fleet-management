import {
  parseMapCoordinate,
  type MapCoordinate,
  type MapMarker,
} from "../../../../maps/map-coordinate";
import type { TripLocationReference } from "../../application/trip-records";

export const ROUTE_PLAN_ORIGIN_LABEL = "مبدأ";
export const ROUTE_PLAN_DESTINATION_LABEL = "مقصد";
export const ROUTE_PLAN_MISSING_COORDINATE_HINT =
  "مختصات این مکان ثبت نشده است.";
export const ROUTE_PLAN_UNSELECTED_LOCATION_NAME = "مکان انتخاب‌نشده";

export type RoutePlanStop = {
  id: string;
  role: "origin" | "intermediate" | "destination";
  label: string;
  locationName: string;
  /** A saved Location was chosen. An empty intermediate slot is not one. */
  hasLocation: boolean;
  coordinate: MapCoordinate | null;
};

export type RoutePlanIntermediate = {
  location: TripLocationReference | null;
};

function locationCoordinate(
  location: TripLocationReference | null,
): MapCoordinate | null {
  if (!location?.latitude || !location.longitude) return null;
  return parseMapCoordinate(location.latitude, location.longitude);
}

function intermediateLabel(index: number): string {
  return (index + 1).toLocaleString("fa-IR");
}

/**
 * Ordered route-planning stops. Origin and destination stay Trip context.
 * They are not copied into the intermediate collection.
 */
export function routePlanStops(input: {
  origin: TripLocationReference | null;
  destination: TripLocationReference | null;
  intermediates: readonly RoutePlanIntermediate[];
}): RoutePlanStop[] {
  const stops: RoutePlanStop[] = [];
  if (input.origin) {
    stops.push({
      id: "origin",
      role: "origin",
      label: ROUTE_PLAN_ORIGIN_LABEL,
      locationName: input.origin.locationName,
      hasLocation: true,
      coordinate: locationCoordinate(input.origin),
    });
  }
  input.intermediates.forEach((point, index) => {
    stops.push({
      id: `intermediate-${index}`,
      role: "intermediate",
      label: intermediateLabel(index),
      locationName:
        point.location?.locationName ?? ROUTE_PLAN_UNSELECTED_LOCATION_NAME,
      hasLocation: point.location !== null,
      coordinate: locationCoordinate(point.location),
    });
  });
  if (input.destination) {
    stops.push({
      id: "destination",
      role: "destination",
      label: ROUTE_PLAN_DESTINATION_LABEL,
      locationName: input.destination.locationName,
      hasLocation: true,
      coordinate: locationCoordinate(input.destination),
    });
  }
  return stops;
}

/** Generic map pins. Stops without coordinates stay in the stop list only. */
export function routePlanMarkers(
  stops: readonly RoutePlanStop[],
  focusedStopId: string | null = null,
): MapMarker[] {
  return stops.flatMap((stop) => {
    if (!stop.coordinate) return [];
    const marker: MapMarker = {
      id: stop.id,
      coordinate: stop.coordinate,
      label: `${stop.label}، ${stop.locationName}`,
    };
    if (focusedStopId) marker.selected = stop.id === focusedStopId;
    return [marker];
  });
}
