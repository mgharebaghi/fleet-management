"use server";

import { reportServerFailure } from "../../../../infrastructure/observability/report-server-failure";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageTrips } from "../../composition/trip.factory";
import type { TripResult } from "../../application/trip-records";
import { consecutiveFormIndexes, parseOptionalInteger, parseTehranDateTime, tripErrorFields, tripFormValues, type TripActionState } from "../trip-form-data";
import { wizardFieldForLocationFailure } from "../create-request/create-wizard";
import { runTripAction } from "../trip-action-runner";

function passengerRequestedPickupDateTime(
  values: Record<string, string>,
  passengerIndex: number,
  inheritedDateTime: Date,
): Date {
  if (values[`passenger.${passengerIndex}.pickupOverride`] !== "true") {
    return inheritedDateTime;
  }
  return (
    parseTehranDateTime(
      values[`passenger.${passengerIndex}.pickupDay`],
      values[`passenger.${passengerIndex}.pickupTime`],
    ) ?? new Date(Number.NaN)
  );
}

function requestedTravelDateTime(
  values: Record<string, string>,
): Date {
  return (
    parseTehranDateTime(
      values.requestedTravelDay,
      values.requestedTravelTime,
    ) ?? new Date(Number.NaN)
  );
}

export async function cancelTripRequestAction(
  tripRequestId: number,
  state: TripActionState,
): Promise<TripActionState> {
  const result = await runTripAction(state.values ?? {}, () =>
    makeManageTrips().cancelRequest(tripRequestId),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  revalidatePath("/trips/requests");
  redirect(`/trips/${tripRequestId}`);
}

export async function changeTripRequestStatusAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState & { success?: boolean }> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const status = values.requestStatus ?? "";
  const enteredDeparture =
    status === "InProgress"
      ? parseTehranDateTime(values.actualDepartureDay, values.actualDepartureTime)
      : null;
  if (enteredDeparture && Number.isNaN(enteredDeparture.getTime())) {
    return { error: "INVALID_DATE", field: "actualDepartureDay", values };
  }
  const result = await runTripAction(values, () =>
    makeManageTrips().changeRequestStatus(
      tripRequestId,
      status,
      enteredDeparture,
    ),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  revalidatePath("/trips/requests");
  return { ...result, success: true, values };
}

export async function startTripAction(
  tripRequestId: number,
  state: TripActionState = {},
): Promise<TripActionState & { success?: boolean }> {
  const result = await runTripAction(state.values ?? {}, () =>
    makeManageTrips().startTrip(tripRequestId),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { success: true };
}

export type CreateTripRequestResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
      field?: string;
      failedLocation?: {
        passengerIndex: number;
        locationRole: "origin" | "destination";
      };
    };

export async function createTripRequestAction(
  values: Record<string, string>,
): Promise<CreateTripRequestResult> {
  const passengerIndexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );
  const commonOrigin = values.commonOriginLocationId;
  const commonDestination = values.commonDestinationLocationId;
  const travelDateTime = requestedTravelDateTime(values);

  for (const index of passengerIndexes) {
    if (values[`passenger.${index}.pickupOverride`] !== "true") continue;
    const pickup = passengerRequestedPickupDateTime(values, index, travelDateTime);
    if (!Number.isFinite(pickup.getTime())) {
      return { success: false, error: "INVALID_DATE", field: `passenger.${index}.pickupDay` };
    }
  }

  let result: TripResult;
  try {
    result = await makeManageTrips().createRequest({
      tripRequestTypeId: Number(values.tripRequestTypeId),
      requestedTravelDateTime: travelDateTime,
      purpose: values.purpose ?? null,
      description: values.requestDescription ?? null,
      passengers: passengerIndexes.map((index) => ({
        passengerPersonId: Number(values[`passenger.${index}.personId`]),
        originLocationId: Number(
          commonOrigin || values[`passenger.${index}.originLocationId`],
        ),
        destinationLocationId: Number(
          commonDestination ||
            values[`passenger.${index}.destinationLocationId`],
        ),
        requestedPickupDateTime: passengerRequestedPickupDateTime(values, index, travelDateTime),
        pickupOrder: parseOptionalInteger(
          values[`passenger.${index}.pickupOrder`],
        ),
        dropoffOrder: parseOptionalInteger(
          values[`passenger.${index}.dropoffOrder`],
        ),
        status: null,
        description: values[`passenger.${index}.description`] ?? null,
      })),
    });
  } catch (error) {
    reportServerFailure("trip.write", error);
    return { success: false, error: "UNEXPECTED" };
  }

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      field: result.failedLocation
        ? wizardFieldForLocationFailure(
            values.requestTypeCode,
            result.failedLocation,
          )
        : result.failedPassengerIndex !== undefined
          ? `passenger.${result.failedPassengerIndex}.personId`
          : result.field ?? tripErrorFields[result.error],
      failedLocation: result.failedLocation,
    };
  }
  revalidatePath("/trips", "layout");
  redirect("/trips");
}
