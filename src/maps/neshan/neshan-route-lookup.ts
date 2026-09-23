import { parseMapCoordinate, type MapCoordinate } from "../map-coordinate";
import {
  cumulativeKilometers,
  decodeRoutePolyline,
  routeKilometersFromMeters,
  routeMinutesFromSeconds,
  type MapRoute,
  type MapRouteResponse,
} from "../map-route";

const NESHAN_ORIGIN = "https://api.neshan.org";
const NESHAN_TIMEOUT_MS = 8_000;

type LookupOptions = {
  apiKey: string | null;
  fetchImpl?: typeof fetch;
};

export function buildNeshanDirectionUrl(
  coordinates: readonly MapCoordinate[],
): URL | null {
  if (coordinates.length < 2) return null;
  const parsed = coordinates.map((coordinate) =>
    parseMapCoordinate(coordinate.latitude, coordinate.longitude),
  );
  if (parsed.some((coordinate) => coordinate === null)) return null;
  const points = parsed as MapCoordinate[];
  const origin = points[0];
  const destination = points[points.length - 1];
  const url = new URL("/v4/direction", NESHAN_ORIGIN);
  url.searchParams.set("type", "car");
  url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  url.searchParams.set("alternative", "false");
  const waypoints = points.slice(1, -1);
  if (waypoints.length > 0) {
    url.searchParams.set(
      "waypoints",
      waypoints
        .map((point) => `${point.latitude},${point.longitude}`)
        .join("|"),
    );
  }
  return url;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function metricValue(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("value" in value)) return null;
  const numeric = finiteNumber((value as { value: unknown }).value);
  if (numeric === null || numeric < 0) return null;
  return numeric;
}

export function normalizeNeshanDirectionBody(body: unknown): MapRoute | null {
  if (!body || typeof body !== "object" || !("routes" in body)) return null;
  const routes = (body as { routes: unknown }).routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;
  const route = routes[0];
  if (!route || typeof route !== "object") return null;
  const record = route as Record<string, unknown>;
  const overview = record.overview_polyline;
  const encoded =
    overview && typeof overview === "object" && "points" in overview
      ? optionalText((overview as { points: unknown }).points)
      : null;
  const path = encoded ? decodeRoutePolyline(encoded) : [];
  if (!Array.isArray(record.legs) || record.legs.length === 0) return null;

  const legMeters: number[] = [];
  const legSeconds: number[] = [];
  for (const leg of record.legs) {
    if (!leg || typeof leg !== "object") return null;
    const legRecord = leg as Record<string, unknown>;
    const distance = metricValue(legRecord.distance);
    const duration = metricValue(legRecord.duration);
    if (distance === null || duration === null) return null;
    legMeters.push(distance);
    legSeconds.push(duration);
  }

  const distanceKm = routeKilometersFromMeters(
    legMeters.reduce((total, meters) => total + meters, 0),
  );
  const durationMinute = routeMinutesFromSeconds(
    legSeconds.reduce((total, seconds) => total + seconds, 0),
  );
  const legDistanceKm = legMeters.map((meters) => routeKilometersFromMeters(meters));
  if (
    distanceKm === null ||
    durationMinute === null ||
    legDistanceKm.some((value) => value === null) ||
    cumulativeKilometers(legDistanceKm as string[], legDistanceKm.length - 1) ===
      null
  ) {
    return null;
  }

  return {
    path,
    distanceKm,
    durationMinute,
    legDistanceKm: legDistanceKm as string[],
  };
}

async function neshanGet(
  url: URL,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  if (url.origin !== NESHAN_ORIGIN) return { ok: false };
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Api-Key": apiKey,
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(NESHAN_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return { ok: false };
    }
    return { ok: true, body: (await response.json()) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function routeNeshanDirections(
  coordinates: readonly MapCoordinate[],
  options: LookupOptions,
): Promise<MapRouteResponse> {
  const url = buildNeshanDirectionUrl(coordinates);
  if (!url) return { status: "invalid" };
  const apiKey = options.apiKey?.trim() ?? "";
  if (!apiKey) return { status: "unavailable" };
  const response = await neshanGet(url, apiKey, options.fetchImpl ?? fetch);
  if (!response.ok) return { status: "unavailable" };
  const route = normalizeNeshanDirectionBody(response.body);
  if (!route) return { status: "unavailable" };
  return { status: "ok", route };
}
