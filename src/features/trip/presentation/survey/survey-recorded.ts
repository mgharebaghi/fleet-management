import type { TripExecutionRecord } from "../../application/trip-records";

export function surveyIsRecorded(execution: Pick<TripExecutionRecord, "passengerRating" | "passengerComment" | "surveyDateTime">): boolean {
  return execution.passengerRating !== null || Boolean(execution.passengerComment?.trim()) || execution.surveyDateTime !== null;
}
