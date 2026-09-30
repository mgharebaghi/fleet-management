import type { TripRepository } from "../trip-repository";
import type { CreateTripRequestCommand, TripResult } from "../trip-records";
import {
  canCancelTripRequest,
  canTransitionTripRequest,
  everyPassengerExecutionCompleted,
  departureInstantForTripStart,
  everyPassengerHasPersistedPlan,
  isTripRequestStatus,
  jalaliYearOf,
  nextTripRequestNo,
  requestHasStartedExecution,
  type TripRequestStatus,
} from "../trip-lifecycle";
import {
  isValidTripDate,
  isValidTripId,
  normalizeTripRequest,
  requestTypeGroupingError,
  tripRequestError,
} from "../trip-validation";

import { failure, locationInputFailure } from "../trip-write-rules";

export async function createRequest(repository: TripRepository, input: CreateTripRequestCommand): Promise<TripResult> {
  const value = normalizeTripRequest({
    ...input,
    passengers: input.passengers.map((passenger) => ({
      ...passenger,
      requestedPickupDateTime: passenger.requestedPickupDateTime ?? input.requestedTravelDateTime,
    })),
  });
  const validationError = tripRequestError(value);
  if (validationError) {
    return failure(
      validationError,
      validationError === "PURPOSE_TOO_LONG" ? "purpose" : undefined,
    );
  }

  const requestDateTime = new Date();
  const jalaliYear = jalaliYearOf(requestDateTime);
  return repository.atomic(
    async (session) => {
      const requestNo = nextTripRequestNo(
        jalaliYear,
        await session.requestNumbers(jalaliYear),
      );
      if (!requestNo) return failure("REQUEST_SEQUENCE_EXHAUSTED");
      if (await session.requestNoExists(requestNo)) {
        return failure("REQUEST_NO_DUPLICATE");
      }

      const requestType = await session.requestType(value.tripRequestTypeId);
      if (!requestType) return failure("REQUEST_TYPE_NOT_FOUND");

      const groupingError = requestTypeGroupingError(
        requestType,
        value.passengers,
      );
      if (groupingError) return failure(groupingError);

      for (const [passengerIndex, passenger] of value.passengers.entries()) {
        const person = await session.person(passenger.passengerPersonId);
        if (!person) return failure("PERSON_NOT_FOUND");
        if (!person.isActive) return failure("PERSON_INACTIVE");

        const origin = await session.location(passenger.originLocationId);
        if (!origin) {
          return locationInputFailure(
            "LOCATION_NOT_FOUND",
            passengerIndex,
            "origin",
          );
        }
        if (origin.isActive === false) {
          return locationInputFailure(
            "LOCATION_INACTIVE",
            passengerIndex,
            "origin",
          );
        }

        const destination = await session.location(
          passenger.destinationLocationId,
        );
        if (!destination) {
          return locationInputFailure(
            "LOCATION_NOT_FOUND",
            passengerIndex,
            "destination",
          );
        }
        if (destination.isActive === false) {
          return locationInputFailure(
            "LOCATION_INACTIVE",
            passengerIndex,
            "destination",
          );
        }
      }

      const created = await session.createRequest({
        ...value,
        requestDateTime,
        requestNo,
        status: "New",
      });
      return { success: true, id: created.tripRequestId };
    },
    { requestNoYear: jalaliYear },
  );
}

export async function changeRequestStatus(repository: TripRepository, tripRequestId: number, targetStatus: string, enteredDeparture: Date | null = null): Promise<TripResult> {
  if (!isValidTripId(tripRequestId)) return failure("INVALID_ID");
  if (!isTripRequestStatus(targetStatus)) {
    return failure("INVALID_REQUEST_STATUS");
  }

  return repository.atomic(async (session) => {
    const current = await session.requestLifecycle(tripRequestId);
    if (!current) return failure("REQUEST_NOT_FOUND");
    if (!isTripRequestStatus(current.status)) {
      return failure("INVALID_REQUEST_STATUS");
    }
    const hasStartedExecution = requestHasStartedExecution(current);
    if (
      !canTransitionTripRequest(
        current.status,
        targetStatus,
        hasStartedExecution,
      )
    ) {
      return failure("INVALID_REQUEST_TRANSITION");
    }
    if (
      targetStatus === "Assigned" &&
      !everyPassengerHasPersistedPlan(current)
    ) {
      return failure("PLANNING_REQUIRED");
    }
    if (targetStatus === "InProgress") {
      if (!everyPassengerHasPersistedPlan(current)) {
        return failure("PLANNING_REQUIRED");
      }
      if (enteredDeparture !== null && !isValidTripDate(enteredDeparture)) {
        return failure("INVALID_DATE");
      }
      const planned = current.requestedTravelDateTime;
      const departure = departureInstantForTripStart({
        entered: enteredDeparture,
        planned:
          planned !== null && isValidTripDate(planned) ? planned : null,
      });
      await session.startTripExecutions(tripRequestId, departure);
    }
    if (
      targetStatus === "Completed" &&
      !everyPassengerExecutionCompleted(current)
    ) {
      return failure("EXECUTIONS_INCOMPLETE");
    }
    if (targetStatus === "Cancelled") {
      await session.cancelPlannedExecutions(tripRequestId);
    }
    await session.updateRequestStatus(
      tripRequestId,
      targetStatus as TripRequestStatus,
    );
    return { success: true, id: tripRequestId };
  });
}

export async function cancelRequest(repository: TripRepository, tripRequestId: number): Promise<TripResult> {
  if (!isValidTripId(tripRequestId)) return failure("INVALID_ID");

  return repository.atomic(async (session) => {
    const current = await session.requestLifecycle(tripRequestId);
    if (!current) return failure("REQUEST_NOT_FOUND");
    if (!isTripRequestStatus(current.status)) {
      return failure("INVALID_REQUEST_STATUS");
    }
    if (
      !canCancelTripRequest(
        current.status,
        requestHasStartedExecution(current),
      )
    ) {
      return failure("INVALID_REQUEST_TRANSITION");
    }
    await session.cancelPlannedExecutions(tripRequestId);
    await session.updateRequestStatus(tripRequestId, "Cancelled");
    return { success: true, id: tripRequestId };
  });
}

export async function startTrip(repository: TripRepository, tripRequestId: number): Promise<TripResult> {
  return changeRequestStatus(repository, tripRequestId, "InProgress");
}
