import type { TripLocationReference } from "../trip-records";

export type CreateLocationCommand = {
  locationName: string;
  locationCode: string | null;
  locationType: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  description: string | null;
};

export type LocationDuplicateCandidate = TripLocationReference & {
  normalizedCode: string | null;
  normalizedName: string;
  normalizedAddress: string | null;
};

export type LocationFailure =
  | "LOCATION_NAME_REQUIRED"
  | "LOCATION_NAME_TOO_LONG"
  | "LOCATION_CODE_TOO_LONG"
  | "LOCATION_TYPE_TOO_LONG"
  | "INVALID_LATITUDE"
  | "INVALID_LONGITUDE"
  | "LOCATION_CODE_DUPLICATE"
  | "LOCATION_NAME_ADDRESS_DUPLICATE"
  | "LOCATION_INACTIVE_DUPLICATE";

export type CreateLocationResult =
  | {
      success: true;
      location: TripLocationReference;
      similarLocations?: TripLocationReference[];
    }
  | {
      success: false;
      error: LocationFailure;
      similarLocations: TripLocationReference[];
    };
