import { parseMapCoordinate, type MapCoordinate, type MapMarker } from "../../../../maps/map-coordinate";
import type { TripLocationReference } from "../../application/trip-records";

export type SavedLocationChoice = {
  locationId: string;
  locationName: string;
  locationType: string | null;
  address: string | null;
  searchText: string;
  coordinate: MapCoordinate | null;
};

function savedLocationCoordinate(
  location: TripLocationReference,
): MapCoordinate | null {
  if (!location.latitude || !location.longitude) return null;
  return parseMapCoordinate(location.latitude, location.longitude);
}

/** Local haystack for a saved Location. Does not include the numeric id. */
export function savedLocationSearchText(location: TripLocationReference): string {
  return [
    location.locationName,
    location.locationCode,
    location.locationType,
    location.address,
  ]
    .filter((part) => part && part.trim())
    .join(" ");
}

export function savedLocationChoices(
  locations: readonly TripLocationReference[],
): SavedLocationChoice[] {
  return locations.map((location) => ({
    locationId: String(location.locationId),
    locationName: location.locationName,
    locationType: location.locationType,
    address: location.address,
    searchText: savedLocationSearchText(location),
    coordinate: savedLocationCoordinate(location),
  }));
}

export function savedLocationMarkers(
  choices: readonly SavedLocationChoice[],
  selectedLocationId: string,
): MapMarker[] {
  return choices.flatMap((choice) =>
    choice.coordinate
      ? [
          {
            id: choice.locationId,
            coordinate: choice.coordinate,
            label: choice.locationName,
            selected: choice.locationId === selectedLocationId,
          },
        ]
      : [],
  );
}

/** Focus coordinate for a saved Location, or null when it cannot be mapped. */
export function focusForSavedLocation(
  choices: readonly SavedLocationChoice[],
  locationId: string,
): MapCoordinate | null {
  return choices.find((choice) => choice.locationId === locationId)?.coordinate ?? null;
}
