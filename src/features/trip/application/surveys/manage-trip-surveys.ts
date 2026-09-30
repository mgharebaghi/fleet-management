import type { TripRepository } from "../trip-repository";
import type { SavePassengerSurveyInput, TripResult } from "../trip-records";

import { isValidTripDate, isValidTripId } from "../trip-validation";

import { failure } from "../trip-write-rules";

export async function saveSurvey(repository: TripRepository, input: SavePassengerSurveyInput, expectedTripRequestId?: number): Promise<TripResult> {
  const value: SavePassengerSurveyInput = {
    ...input,
    passengerComment: input.passengerComment?.trim() || null,
  };

  if (!isValidTripId(value.tripExecutionId)) {
    return failure("INVALID_ID");
  }
  if (
    value.passengerRating !== null &&
    (!Number.isInteger(value.passengerRating) ||
      value.passengerRating < -2_147_483_648 ||
      value.passengerRating > 2_147_483_647)
  ) {
    return failure("INVALID_RATING");
  }
  if (
    value.surveyDateTime !== null &&
    value.surveyDateTime !== undefined &&
    !isValidTripDate(value.surveyDateTime)
  ) {
    return failure("INVALID_DATE");
  }

  return repository.atomic(async (session) => {
    const execution = await session.execution(value.tripExecutionId);
    if (!execution || (expectedTripRequestId !== undefined && execution.requestId !== expectedTripRequestId)) return failure("EXECUTION_NOT_FOUND");
    if (execution.status !== "Completed") {
      return failure("SURVEY_NOT_ALLOWED");
    }
    if (execution.requestStatus === "Cancelled") {
      return failure("REQUEST_TERMINAL");
    }
    const surveyDateTime =
      execution.surveyDateTime ?? value.surveyDateTime ?? new Date();
    await session.updateSurvey({
      ...value,
      surveyDateTime,
    });
    return { success: true, id: value.tripExecutionId };
  });
}
