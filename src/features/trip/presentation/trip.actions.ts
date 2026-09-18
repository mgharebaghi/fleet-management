"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeManageTrips } from "../composition/trip.factory";
import type { TripResult } from "../application/trip-records";
import {
  consecutiveFormIndexes,
  parseOptionalInteger,
  parseTehranDateTime,
  tripErrorFields,
  tripFormValues,
  type TripActionState,
} from "./trip-form-data";
import { wizardFieldForLocationFailure } from "./create-request/create-wizard";

async function run(
  values: Record<string, string>,
  work: () => Promise<TripResult>,
): Promise<TripActionState | { id: number }> {
  let result: TripResult;
  try {
    result = await work();
  } catch {
    return { error: "UNEXPECTED", values };
  }
  return result.success
    ? { id: result.id }
    : {
        error: result.error,
        field: result.failedLocation
          ? undefined
          : result.field ?? tripErrorFields[result.error],
        failedLocation: result.failedLocation,
        values,
      };
}

export async function createTripRequestAction(
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const passengerIndexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );

  const commonOrigin = values.commonOriginLocationId;
  const commonDestination = values.commonDestinationLocationId;

  const result = await run(values, () =>
    makeManageTrips().createRequest({
      tripRequestTypeId: Number(values.tripRequestTypeId),
      requestDateTime:
        parseTehranDateTime(values.requestDay, values.requestTime) ??
        new Date(Number.NaN),
      requestedTravelDateTime:
        parseTehranDateTime(
          values.requestedTravelDay,
          values.requestedTravelTime,
        ) ?? new Date(Number.NaN),
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
        requestedPickupDateTime: parseTehranDateTime(
          values[`passenger.${index}.pickupDay`],
          values[`passenger.${index}.pickupTime`],
        ),
        pickupOrder: parseOptionalInteger(
          values[`passenger.${index}.pickupOrder`],
        ),
        dropoffOrder: parseOptionalInteger(
          values[`passenger.${index}.dropoffOrder`],
        ),
        status: null,
        description: values[`passenger.${index}.description`] ?? null,
      })),
    }),
  );

  if (!("id" in result)) {
    if (!result.failedLocation) return result;
    return {
      ...result,
      field: wizardFieldForLocationFailure(
        values.requestTypeCode,
        result.failedLocation,
      ),
    };
  }
  revalidatePath("/trips", "layout");
  redirect(`/trips/${result.id}`);
}

export async function changeTripRequestStatusAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const result = await run(values, () =>
    makeManageTrips().changeRequestStatus(
      tripRequestId,
      values.requestStatus ?? "",
    ),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  redirect(`/trips/${tripRequestId}`);
}

export async function addTripRouteAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const pointIndexes = consecutiveFormIndexes(
    values,
    (index) => `point.${index}.locationId`,
  );

  const result = await run(values, () =>
    makeManageTrips().addRoute({
      tripId: Number(values.tripId),
      tripExecutionId: null,
      routeName: values.routeName ?? "",
      alternativeNo: parseOptionalInteger(values.alternativeNo),
      distanceKm: values.distanceKm?.trim() || null,
      estimatedDurationMinute: parseOptionalInteger(
        values.estimatedDurationMinute,
      ),
      isSelected: values.isSelected === "true",
      description: values.routeDescription ?? null,
      points: pointIndexes.map((index) => ({
        locationId: Number(values[`point.${index}.locationId`]),
        trafficZone: values[`point.${index}.trafficZone`] ?? null,
        sequenceNo: parseOptionalInteger(
          values[`point.${index}.sequenceNo`],
        ),
        distanceFromStartKm:
          values[`point.${index}.distanceFromStartKm`]?.trim() || null,
        description: values[`point.${index}.description`] ?? null,
      })),
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(`/trips/${tripRequestId}#planning`);
}

export async function saveTripExecutionAction(
  tripRequestId: number,
  tripId: number,
  tripExecutionId: number | null,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  const result = await run(values, () =>
    makeManageTrips().saveExecution({
      tripId,
      tripExecutionId,
      vehicleDriverAssignmentId: Number(values.assignmentId),
      actualPickupDateTime: parseTehranDateTime(
        values.actualPickupDay,
        values.actualPickupTime,
      ),
      actualDropoffDateTime: parseTehranDateTime(
        values.actualDropoffDay,
        values.actualDropoffTime,
      ),
      startOdometer: values.startOdometer?.trim() || null,
      endOdometer: values.endOdometer?.trim() || null,
      status:
        values.executionStatus ??
        (tripExecutionId === null ? "Planned" : ""),
      description: values.executionDescription ?? null,
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(
    `/trips/${tripRequestId}#${tripExecutionId === null ? "planning" : "execution"}`,
  );
}

export async function savePassengerSurveyAction(
  tripRequestId: number,
  tripExecutionId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  const result = await run(values, () =>
    makeManageTrips().saveSurvey({
      tripExecutionId,
      passengerRating: parseOptionalInteger(values.passengerRating),
      passengerComment: values.passengerComment ?? null,
      surveyDateTime: parseTehranDateTime(
        values.surveyDay,
        values.surveyTime,
      ),
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(`/trips/${tripRequestId}#return`);
}
