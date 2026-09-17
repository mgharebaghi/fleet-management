"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeManageTrips } from "../composition/trip.factory";
import type { TripResult } from "../application/trip-records";
import {
  parseOptionalInteger,
  parseTehranDateTime,
  tripFormValues,
  type TripActionState,
} from "./trip-form-data";

function validCount(value: string | undefined, maximum: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 && count <= maximum
    ? count
    : null;
}

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
    : { error: result.error, values };
}

export async function createTripRequestAction(
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const passengerCount = validCount(values.passengerCount, 50);
  if (passengerCount === null) {
    return { error: "INVALID_FORM", values };
  }

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
      passengers: Array.from({ length: passengerCount }, (_, index) => ({
        passengerPersonId: Number(values[`passenger.${index}.personId`]),
        originLocationId: Number(values[`passenger.${index}.originLocationId`]),
        destinationLocationId: Number(
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
        status: values[`passenger.${index}.status`] ?? null,
        description: values[`passenger.${index}.description`] ?? null,
      })),
    }),
  );

  if (!("id" in result)) return result;
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
  redirect(`/trips/${tripRequestId}?tab=general`);
}

export async function addTripRouteAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const pointCount = validCount(values.pointCount, 50);
  if (pointCount === null) return { error: "INVALID_FORM", values };

  const result = await run(values, () =>
    makeManageTrips().addRoute({
      tripId: Number(values.tripId),
      routeName: values.routeName ?? "",
      alternativeNo: parseOptionalInteger(values.alternativeNo),
      distanceKm: values.distanceKm?.trim() || null,
      estimatedDurationMinute: parseOptionalInteger(
        values.estimatedDurationMinute,
      ),
      isSelected: values.isSelected === "true",
      description: values.routeDescription ?? null,
      points: Array.from({ length: pointCount }, (_, index) => ({
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
  redirect(`/trips/${tripRequestId}?tab=route`);
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
  redirect(`/trips/${tripRequestId}?tab=execution`);
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
  redirect(`/trips/${tripRequestId}?tab=survey`);
}
