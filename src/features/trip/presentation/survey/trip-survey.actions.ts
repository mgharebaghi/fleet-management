"use server";


import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageTrips } from "../../composition/trip.factory";

import { parseOptionalInteger, tripFormValues, type TripActionState } from "../trip-form-data";

import { runTripAction } from "../trip-action-runner";

export async function savePassengerSurveyAction(
  tripRequestId: number,
  tripExecutionId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  const result = await runTripAction(values, () =>
    makeManageTrips().saveSurvey({
      tripExecutionId,
      passengerRating: parseOptionalInteger(values.passengerRating),
      passengerComment: values.passengerComment ?? null,
    }, tripRequestId),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(`/trips/${tripRequestId}?tab=completion`);
}
