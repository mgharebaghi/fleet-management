import type { TripRepository } from "../trip-repository";
import type { SaveTripExecutionInput, TripResult } from "../trip-records";
import {
  canTransitionTripExecution,
  executionHasStarted,
  isNonTerminalTripExecutionStatus,
  isTerminalTripRequestStatus,
  isTripExecutionStatus,
} from "../trip-lifecycle";
import {
  normalizeTripExecution,
  tripExecutionError,
  tripExecutionStateError,
} from "../trip-validation";
import { vehiclePassengerCapacityExceeded } from "../trip-vehicle-capacity";
import { failure, assignmentFailure } from "../trip-write-rules";

export async function saveExecution(repository: TripRepository, input: SaveTripExecutionInput, expectedTripRequestId?: number): Promise<TripResult> {
  const normalized = normalizeTripExecution(input);
  const value = {
    ...normalized,
    status:
      normalized.tripExecutionId === null ? "Planned" : normalized.status,
  };
  const validationError = tripExecutionError(value);
  if (validationError) return failure(validationError);
  const targetStatus = value.status;
  if (!isTripExecutionStatus(targetStatus)) {
    return failure("INVALID_EXECUTION_STATUS");
  }
  const stateError = tripExecutionStateError(value);
  if (stateError) return failure(stateError);

  return repository.atomic(async (session) => {
    const trip = await session.trip(value.tripId);
    if (!trip || (expectedTripRequestId !== undefined && trip.requestId !== expectedTripRequestId)) return failure("TRIP_NOT_FOUND");
    if (isTerminalTripRequestStatus(trip.requestStatus)) {
      return failure("REQUEST_TERMINAL");
    }
    if (
      value.tripExecutionId === null &&
      trip.requestStatus === "InProgress"
    ) {
      return failure("REQUEST_TERMINAL");
    }

    const activeExecutions = trip.executions.filter((execution) =>
      isNonTerminalTripExecutionStatus(execution.status),
    );
    if (value.tripExecutionId === null && activeExecutions.length > 0) {
      return failure("ACTIVE_EXECUTION_EXISTS");
    }

    let alreadyStarted = false;
    if (value.tripExecutionId !== null) {
      const execution = await session.execution(value.tripExecutionId);
      if (!execution || execution.tripId !== value.tripId) {
        return failure("EXECUTION_NOT_FOUND");
      }
      if (!isTripExecutionStatus(execution.status)) {
        return failure("INVALID_EXECUTION_STATUS");
      }
      alreadyStarted = executionHasStarted(execution);
      if (
        !canTransitionTripExecution(
          execution.status,
          targetStatus,
          alreadyStarted || value.actualPickupDateTime !== null,
        )
      ) {
        return failure("INVALID_EXECUTION_TRANSITION");
      }
      if (
        alreadyStarted &&
        execution.vehicleDriverAssignmentId !==
          value.vehicleDriverAssignmentId
      ) {
        return failure("ASSIGNMENT_IMMUTABLE");
      }
      if (
        activeExecutions.some(
          (active) => active.tripExecutionId !== value.tripExecutionId,
        )
      ) {
        return failure("ACTIVE_EXECUTION_EXISTS");
      }
    }

    const scheduledDateTime =
      trip.requestedPickupDateTime ?? trip.requestedTravelDateTime;
    const assignment = await session.assignment(
      value.vehicleDriverAssignmentId,
      scheduledDateTime,
    );
    if (!assignment) return failure("ASSIGNMENT_NOT_FOUND");
    if (!alreadyStarted) {
      const eligibilityError = assignmentFailure(
        assignment,
        scheduledDateTime,
        assignment.fromDateTime,
        assignment.toDateTime,
      );
      if (eligibilityError) return failure(eligibilityError);
    }

    if (isNonTerminalTripExecutionStatus(targetStatus)) {
      const persistedActiveCounts = await session.activePassengerCountsByVehicle(
        [assignment.vehicle.vehicleId], value.tripExecutionId ?? undefined,
      );
      if (vehiclePassengerCapacityExceeded({ persistedActiveCounts, submittedVehicleIds: [assignment.vehicle.vehicleId] })) {
        return failure("VEHICLE_PASSENGER_CAPACITY_EXCEEDED");
      }
    }

    if (value.tripExecutionId === null) {
      return {
        success: true,
        id: await session.createExecution(value),
      };
    }

    await session.updateExecution({
      ...value,
      tripExecutionId: value.tripExecutionId,
    });
    return { success: true, id: value.tripExecutionId };
  });
}
