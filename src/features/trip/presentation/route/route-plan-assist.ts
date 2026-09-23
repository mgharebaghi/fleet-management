import type { MapCoordinate } from "../../../../maps/map-coordinate";
import { cumulativeKilometers, type MapRoute } from "../../../../maps/map-route";
import {
  routePlanStops,
  type RoutePlanIntermediate,
  type RoutePlanStop,
} from "./route-plan-markers";
import type { TripLocationReference } from "../../application/trip-records";

export const ROUTE_ASSIST_DEBOUNCE_MS = 500;

export const ROUTE_PLAN_MISSING_ENDPOINT_MESSAGE =
  "برای نمایش مسیر روی نقشه، مختصات مبدأ و مقصد باید ثبت شده باشد.";
export const ROUTE_PLAN_MISSING_INTERMEDIATE_MESSAGE =
  "مختصات یکی از نقاط میانی ثبت نشده است؛ مسیریابی خودکار در دسترس نیست.";
export const ROUTE_PLAN_INCOMPLETE_POINT_MESSAGE =
  "نقطه میانی را انتخاب کنید تا مسیریابی انجام شود.";
export const ROUTE_PLAN_ROUTING_UNAVAILABLE_MESSAGE =
  "مسیریابی خودکار فعلاً در دسترس نیست؛ می‌توانید اطلاعات مسیر را دستی ثبت کنید.";

export type AssistedField = {
  value: string;
  edited: boolean;
  suggestion: string | null;
};

export function emptyAssistedField(): AssistedField {
  return { value: "", edited: false, suggestion: null };
}

/** A saved value is already an explicit choice, so routing must not replace it. */
export function assistedFieldFromSaved(value: string): AssistedField {
  const trimmed = value.trim();
  return {
    value: trimmed,
    edited: trimmed.length > 0,
    suggestion: null,
  };
}

export function proposeAssistedValue(
  field: AssistedField,
  next: string | null,
): AssistedField {
  if (next === null) return field;
  if (!field.edited) {
    if (field.value === next && field.suggestion === null) return field;
    return { value: next, edited: false, suggestion: null };
  }
  if (field.value.trim() === next) {
    if (field.suggestion === null) return field;
    return { ...field, suggestion: null };
  }
  if (field.suggestion === next) return field;
  return { ...field, suggestion: next };
}

export function editAssistedValue(
  field: AssistedField,
  value: string,
): AssistedField {
  const suggestion =
    field.suggestion && field.suggestion !== value.trim()
      ? field.suggestion
      : null;
  return { value, edited: true, suggestion };
}

export function acceptAssistedSuggestion(field: AssistedField): AssistedField {
  if (!field.suggestion) return field;
  return { value: field.suggestion, edited: true, suggestion: null };
}

export type RoutePlanReadiness =
  | { status: "ready"; coordinates: MapCoordinate[] }
  | { status: "missing-endpoint" }
  | { status: "missing-intermediate" }
  | { status: "incomplete-point" };

export function routePlanReadiness(
  stops: readonly RoutePlanStop[],
): RoutePlanReadiness {
  const origin = stops.find((stop) => stop.role === "origin");
  const destination = stops.find((stop) => stop.role === "destination");
  if (!origin?.coordinate || !destination?.coordinate) {
    return { status: "missing-endpoint" };
  }
  const intermediates = stops.filter((stop) => stop.role === "intermediate");
  if (intermediates.some((stop) => !stop.hasLocation)) {
    return { status: "incomplete-point" };
  }
  if (intermediates.some((stop) => !stop.coordinate)) {
    return { status: "missing-intermediate" };
  }
  return {
    status: "ready",
    coordinates: stops.flatMap((stop) =>
      stop.coordinate ? [stop.coordinate] : [],
    ),
  };
}

export function routeCoordinateKey(coordinates: readonly MapCoordinate[]): string {
  return coordinates
    .map((coordinate) => `${coordinate.latitude},${coordinate.longitude}`)
    .join("|");
}

export function sequenceNumbers(count: number): string[] {
  return Array.from({ length: count }, (_, index) => String(index + 1));
}

export function suggestPointDistances(
  fields: readonly AssistedField[],
  route: MapRoute,
): AssistedField[] | null {
  const cumulative = cumulativeKilometers(route.legDistanceKm, fields.length);
  if (!cumulative) return null;
  return fields.map((field, index) =>
    proposeAssistedValue(field, cumulative[index] ?? null),
  );
}

export function readinessForLocations(input: {
  origin: TripLocationReference | null;
  destination: TripLocationReference | null;
  intermediates: readonly RoutePlanIntermediate[];
}): RoutePlanReadiness {
  return routePlanReadiness(routePlanStops(input));
}
