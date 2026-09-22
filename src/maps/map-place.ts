import type { MapCoordinate } from "./map-coordinate";

export const MAP_SEARCH_MIN_LENGTH = 2;
export const MAP_SEARCH_DEBOUNCE_MS = 500;
const MAP_SEARCH_MAX_LENGTH = 100;

export type MapSearchResult = {
  id: string;
  title: string;
  address: string;
  coordinate: MapCoordinate;
  region: string | null;
  category: string | null;
};

export type MapSearchResponse =
  | { status: "ok"; results: MapSearchResult[] }
  | { status: "unavailable" }
  | { status: "invalid" };

export type MapReverseResponse =
  | { status: "ok"; address: string }
  | { status: "unavailable" }
  | { status: "invalid" };

export function normalizeSearchTerm(term: string): string | null {
  const normalized = term.trim().replace(/\s+/g, " ");
  const characters = [...normalized];
  if (characters.length < MAP_SEARCH_MIN_LENGTH) return null;
  return characters.slice(0, MAP_SEARCH_MAX_LENGTH).join("");
}

export function lookupCacheKey(term: string, center: MapCoordinate): string {
  return `${term}\n${center.latitude}\n${center.longitude}`;
}

/** A slower lookup must not replace the result of a newer query. */
export function isCurrentLookup(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}
