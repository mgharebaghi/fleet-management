"use server";


import { revalidatePath } from "next/cache";

import { makeManageTrips } from "../../composition/trip.factory";

import { consecutiveFormIndexes, parseOptionalInteger, tripFormValues, type TripActionState } from "../trip-form-data";

import { runTripAction } from "../trip-action-runner";

export async function addTripRouteAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState & { success?: boolean }> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const pointIndexes = consecutiveFormIndexes(
    values,
    (index) => `point.${index}.locationId`,
  );

  const routeId = parseOptionalInteger(values.routeId);

  const result = await runTripAction(values, () =>
    makeManageTrips().saveRoute({
      routeId: routeId && !Number.isNaN(routeId) ? routeId : null,
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
    }, tripRequestId),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  return { success: true };
}

export async function deleteTripRouteAction(
  tripRequestId: number,
  routeId: number,
  state: TripActionState = {},
): Promise<TripActionState & { success?: boolean }> {
  const result = await runTripAction(state.values ?? {}, () =>
    makeManageTrips().deleteRoute({ tripRequestId, routeId }),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  return { success: true };
}
