import {
  mapCoordinateFromDegrees,
  type MapCoordinate,
} from "./map-coordinate";

/** A road path the map can draw, plus optional distance assistance. */
export type MapRoute = {
  path: MapCoordinate[];
  /** Kilometers, at most two decimal places, matching Route.DistanceKm. */
  distanceKm: string;
  /** Whole minutes, matching Route.EstimatedDurationMinute. */
  durationMinute: number;
  /**
   * Kilometers for each leg from the first coordinate toward the last.
   * One more entry than the number of intermediate points.
   */
  legDistanceKm: string[];
};

export type MapRouteResponse =
  | { status: "ok"; route: MapRoute }
  | { status: "unavailable" }
  | { status: "invalid" };

const MAX_DISTANCE_KM = 99_999_999.99;
const MAX_DURATION_MINUTE = 2_147_483_647;

/** Google-style encoded polyline, precision 5, as returned by Neshan. */
export function decodeRoutePolyline(encoded: string): MapCoordinate[] {
  const coordinates: MapCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeDelta = decodeChunk(encoded, index);
    if (!latitudeDelta) return [];
    index = latitudeDelta.index;
    latitude += latitudeDelta.delta;

    const longitudeDelta = decodeChunk(encoded, index);
    if (!longitudeDelta) return [];
    index = longitudeDelta.index;
    longitude += longitudeDelta.delta;

    const coordinate = mapCoordinateFromDegrees(latitude / 1e5, longitude / 1e5);
    if (!coordinate) return [];
    coordinates.push(coordinate);
  }

  return coordinates;
}

function decodeChunk(
  encoded: string,
  start: number,
): { delta: number; index: number } | null {
  let result = 0;
  let shift = 0;
  let index = start;
  let byte = 0;
  do {
    if (index >= encoded.length) return null;
    byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
    if (shift > 32) return null;
  } while (byte >= 0x20);
  const delta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
  return { delta, index };
}

export function routeKilometersFromMeters(meters: number): string | null {
  if (!Number.isFinite(meters) || meters < 0) return null;
  const hundredths = Math.round(meters / 10);
  if (hundredths / 100 > MAX_DISTANCE_KM) return null;
  return formatHundredths(hundredths);
}

export function routeMinutesFromSeconds(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes > MAX_DURATION_MINUTE) return null;
  return minutes;
}

export function cumulativeKilometers(
  legDistanceKm: readonly string[],
  intermediateCount: number,
): string[] | null {
  if (intermediateCount < 0 || legDistanceKm.length !== intermediateCount + 1) {
    return null;
  }
  const result: string[] = [];
  let total = 0;
  for (let index = 0; index < intermediateCount; index += 1) {
    const hundredths = parseHundredths(legDistanceKm[index] ?? "");
    if (hundredths === null) return null;
    total += hundredths;
    if (total / 100 > MAX_DISTANCE_KM) return null;
    result.push(formatHundredths(total));
  }
  return result;
}

function parseHundredths(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function formatHundredths(hundredths: number): string {
  const whole = Math.trunc(hundredths / 100);
  const fraction = hundredths % 100;
  if (fraction === 0) return String(whole);
  if (fraction % 10 === 0) return `${whole}.${fraction / 10}`;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}
