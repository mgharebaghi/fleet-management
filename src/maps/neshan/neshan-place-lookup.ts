import {
  mapCoordinateFromDegrees,
  parseMapCoordinate,
  type MapCoordinate,
} from "../map-coordinate";
import {
  normalizeSearchTerm,
  type MapReverseResponse,
  type MapSearchResponse,
  type MapSearchResult,
} from "../map-place";

const NESHAN_ORIGIN = "https://api.neshan.org";
const NESHAN_TIMEOUT_MS = 8_000;

type LookupOptions = {
  apiKey: string | null;
  fetchImpl?: typeof fetch;
};

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

export function buildNeshanSearchUrl(
  term: string,
  center: MapCoordinate,
): URL | null {
  const normalizedTerm = normalizeSearchTerm(term);
  const coordinate = parseMapCoordinate(center.latitude, center.longitude);
  if (!normalizedTerm || !coordinate) return null;
  const url = new URL("/v3/search", NESHAN_ORIGIN);
  url.searchParams.set(
    "q",
    JSON.stringify({
      term: normalizedTerm,
      center: {
        latitude: Number(coordinate.latitude),
        longitude: Number(coordinate.longitude),
      },
    }),
  );
  return url;
}

export function buildNeshanReverseUrl(coordinate: MapCoordinate): URL | null {
  const parsed = parseMapCoordinate(coordinate.latitude, coordinate.longitude);
  if (!parsed) return null;
  const url = new URL("/v5/reverse", NESHAN_ORIGIN);
  url.searchParams.set("lat", parsed.latitude);
  url.searchParams.set("lng", parsed.longitude);
  return url;
}

export function normalizeNeshanSearchBody(body: unknown): MapSearchResult[] | null {
  if (!body || typeof body !== "object" || !("items" in body)) return null;
  const items = body.items;
  if (!Array.isArray(items)) return null;
  const results: MapSearchResult[] = [];
  items.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const title = optionalText(record.title);
    const location = record.location;
    if (!title || !location || typeof location !== "object") return;
    const point = location as Record<string, unknown>;
    const longitude = finiteNumber(point.x);
    const latitude = finiteNumber(point.y);
    if (longitude === null || latitude === null) return;
    const coordinate = mapCoordinateFromDegrees(latitude, longitude);
    if (!coordinate) return;
    results.push({
      id: `${index + 1}:${coordinate.latitude}:${coordinate.longitude}:${title}`,
      title,
      address: optionalText(record.address) ?? "",
      coordinate,
      region: optionalText(record.region),
      category: optionalText(record.category),
    });
  });
  return results;
}

export function normalizeNeshanReverseBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.status !== "OK") return null;
  return optionalText(record.formatted_address);
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

export async function searchNeshanPlaces(
  input: { term: string; latitude: string; longitude: string },
  options: LookupOptions,
): Promise<MapSearchResponse> {
  const url = buildNeshanSearchUrl(input.term, {
    latitude: input.latitude,
    longitude: input.longitude,
  });
  if (!url) return { status: "invalid" };
  const apiKey = options.apiKey?.trim() ?? "";
  if (!apiKey) return { status: "unavailable" };
  const response = await neshanGet(url, apiKey, options.fetchImpl ?? fetch);
  if (!response.ok) return { status: "unavailable" };
  const results = normalizeNeshanSearchBody(response.body);
  if (!results) return { status: "unavailable" };
  return { status: "ok", results };
}

export async function reverseNeshanPlace(
  coordinate: MapCoordinate,
  options: LookupOptions,
): Promise<MapReverseResponse> {
  const url = buildNeshanReverseUrl(coordinate);
  if (!url) return { status: "invalid" };
  const apiKey = options.apiKey?.trim() ?? "";
  if (!apiKey) return { status: "unavailable" };
  const response = await neshanGet(url, apiKey, options.fetchImpl ?? fetch);
  if (!response.ok) return { status: "unavailable" };
  const address = normalizeNeshanReverseBody(response.body);
  if (!address) return { status: "unavailable" };
  return { status: "ok", address };
}
