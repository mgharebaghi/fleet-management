"use server";

import type { MapCoordinate } from "../map-coordinate";
import type { MapReverseResponse, MapSearchResponse } from "../map-place";
import type { MapRouteResponse } from "../map-route";
import {
  NESHAN_PUBLIC_MAP_KEY_ENV,
  NESHAN_SERVICE_API_KEY_ENV,
  readRuntimeEnv,
} from "../neshan/neshan-env";
import {
  reverseNeshanPlace,
  searchNeshanPlaces,
} from "../neshan/neshan-place-lookup";
import { routeNeshanDirections } from "../neshan/neshan-route-lookup";

export async function loadMapConfiguration(): Promise<{ mapKey: string | null }> {
  return { mapKey: await readRuntimeEnv(NESHAN_PUBLIC_MAP_KEY_ENV) };
}

export async function searchMapPlaces(input: {
  term: string;
  latitude: string;
  longitude: string;
}): Promise<MapSearchResponse> {
  return searchNeshanPlaces(input, {
    apiKey: await readRuntimeEnv(NESHAN_SERVICE_API_KEY_ENV),
  });
}

export async function loadMapRoute(input: {
  coordinates: MapCoordinate[];
}): Promise<MapRouteResponse> {
  return routeNeshanDirections(input.coordinates, {
    apiKey: await readRuntimeEnv(NESHAN_SERVICE_API_KEY_ENV),
  });
}

export async function reverseMapPoint(
  coordinate: MapCoordinate,
): Promise<MapReverseResponse> {
  return reverseNeshanPlace(coordinate, {
    apiKey: await readRuntimeEnv(NESHAN_SERVICE_API_KEY_ENV),
  });
}
