import { reportServerFailure } from "../../../infrastructure/observability/report-server-failure";

import type { TripResult } from "../application/trip-records";
import { tripErrorFields, type TripActionState } from "./trip-form-data";

export async function runTripAction(
  values: Record<string, string>,
  work: () => Promise<TripResult>,
): Promise<TripActionState | { id: number }> {
  let result: TripResult;
  try {
    result = await work();
  } catch (error) {
    reportServerFailure("trip.write", error);
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
