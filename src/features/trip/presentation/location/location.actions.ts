"use server";

import { makeManageLocations } from "../../composition/location.factory";
import type {
  LocationFailure,
} from "../../application/location/location-records";
import type { TripLocationReference } from "../../application/trip-records";
import { tripFormValues } from "../trip-form-data";

export type LocationFieldName =
  | "locationName"
  | "locationCode"
  | "locationType"
  | "latitude"
  | "longitude";

export type CreateLocationActionState = {
  error?: LocationFailure | "INVALID_FORM" | "UNEXPECTED";
  field?: LocationFieldName;
  values?: Record<string, string>;
  location?: TripLocationReference;
  similarLocations?: TripLocationReference[];
};

const errorField: Partial<Record<LocationFailure, LocationFieldName>> = {
  LOCATION_NAME_REQUIRED: "locationName",
  LOCATION_NAME_TOO_LONG: "locationName",
  LOCATION_CODE_TOO_LONG: "locationCode",
  LOCATION_CODE_DUPLICATE: "locationCode",
  LOCATION_TYPE_TOO_LONG: "locationType",
  INVALID_LATITUDE: "latitude",
  INVALID_LONGITUDE: "longitude",
};

export async function createLocationAction(
  _state: CreateLocationActionState,
  data: FormData,
): Promise<CreateLocationActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  try {
    const result = await makeManageLocations().create({
      locationName: values.locationName ?? "",
      locationCode: values.locationCode ?? null,
      locationType: values.locationType ?? null,
      address: values.address ?? null,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
      description: values.description ?? null,
    });
    if (!result.success) {
      return {
        error: result.error,
        field: errorField[result.error],
        values,
        similarLocations: result.similarLocations,
      };
    }
    return {
      location: result.location,
      similarLocations: result.similarLocations,
    };
  } catch {
    return { error: "UNEXPECTED", values };
  }
}
