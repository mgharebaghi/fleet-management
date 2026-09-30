"use server";


import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageTrips } from "../../composition/trip.factory";

import { parseTehranDateTime, tripFormValues, type TripActionState } from "../trip-form-data";

import { runTripAction } from "../trip-action-runner";

export async function saveTripExecutionAction(
  tripRequestId: number,
  tripId: number,
  tripExecutionId: number | null,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  const result = await runTripAction(values, () =>
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
    }, tripRequestId),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  redirect(
    `/trips/${tripRequestId}?tab=${tripExecutionId === null ? "assignment" : "completion"}`,
  );
}

export type PassengerExecutionSave = {
  tripId: number;
  tripExecutionId: number;
  values: Record<string, string>;
};

export type PassengerExecutionBatchResult = {
  savedTripIds: number[];
  failed?: {
    tripId: number;
    error: TripActionState["error"];
    field?: string;
  };
};

export async function savePassengerExecutionsAction(
  tripRequestId: number,
  items: PassengerExecutionSave[],
): Promise<PassengerExecutionBatchResult> {
  const savedTripIds: number[] = [];

  for (const item of items) {
    const result = await runTripAction(item.values, () =>
      makeManageTrips().saveExecution({
        tripId: item.tripId,
        tripExecutionId: item.tripExecutionId,
        vehicleDriverAssignmentId: Number(item.values.assignmentId),
        actualPickupDateTime: parseTehranDateTime(
          item.values.actualPickupDay,
          item.values.actualPickupTime,
        ),
        actualDropoffDateTime: parseTehranDateTime(
          item.values.actualDropoffDay,
          item.values.actualDropoffTime,
        ),
        startOdometer: item.values.startOdometer?.trim() || null,
        endOdometer: item.values.endOdometer?.trim() || null,
        status: item.values.executionStatus ?? "",
        description: item.values.executionDescription ?? null,
      }, tripRequestId),
    );

    if (!("id" in result)) {
      return {
        savedTripIds,
        failed: { tripId: item.tripId, error: result.error, field: result.field },
      };
    }

    savedTripIds.push(item.tripId);
  }

  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { savedTripIds };
}
