"use server";

import { reportServerFailure } from "../../../../infrastructure/observability/report-server-failure";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageTrips } from "../../composition/trip.factory";
import type { TripResult } from "../../application/trip-records";

export type AssignInitialTripRequestPayload = {
  tripRequestId: number;
  assignments: Record<number, number>;
  routes: Array<{
    tripId: number;
    routeName: string;
    alternativeNo: number | null;
    distanceKm: string | null;
    estimatedDurationMinute: number | null;
    isSelected: boolean;
    description: string | null;
    points: Array<{
      locationId: number;
      trafficZone: string | null;
      sequenceNo: number | null;
      distanceFromStartKm: string | null;
      description: string | null;
    }>;
  }>;
};

export async function assignInitialTripRequestAction(
  payload: AssignInitialTripRequestPayload,
): Promise<{ success: true } | { success: false; error: string; field?: string }> {
  let result: TripResult;
  try {
    const passengers = Object.entries(payload.assignments).map(
      ([tripIdStr, assignmentId]) => {
        const tripId = Number(tripIdStr);
        const passengerRoutes = payload.routes
          .filter((route) => route.tripId === tripId)
          .map((route) => ({
            routeName: route.routeName,
            alternativeNo: route.alternativeNo,
            distanceKm: route.distanceKm,
            estimatedDurationMinute: route.estimatedDurationMinute,
            isSelected: route.isSelected,
            description: route.description,
            points: route.points,
          }));
        return {
          tripId,
          vehicleDriverAssignmentId: assignmentId,
          routes: passengerRoutes,
        };
      },
    );

    result = await makeManageTrips().assignInitialRequest({
      tripRequestId: payload.tripRequestId,
      passengers,
    });
  } catch (error) {
    reportServerFailure("trip.write", error);
    return { success: false, error: "UNEXPECTED" };
  }

  if (!result.success) {
    return { success: false, error: result.error, field: result.field };
  }

  revalidatePath("/trips", "layout");
  redirect(`/trips/${payload.tripRequestId}`);
}
