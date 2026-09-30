import type { TripRepository } from "../trip-repository";
import type { TripPassengerInput, TripResult } from "../trip-records";
import { executionHasStarted, isTerminalTripRequestStatus } from "../trip-lifecycle";
import {
  isValidTripId,
  normalizeTripPassenger,
  requestTypeGroupingError,
  tripPassengerError,
} from "../trip-validation";

import { failure } from "../trip-write-rules";

export async function addPassenger(repository: TripRepository, input: {
    tripRequestId: number;
    passenger: TripPassengerInput;
  }): Promise<TripResult> {
  if (!isValidTripId(input.tripRequestId)) return failure("INVALID_ID");
  const passenger = normalizeTripPassenger(input.passenger);
  const validationError = tripPassengerError(passenger);
  if (validationError) return failure(validationError);

  return repository.atomic(async (session) => {
    const request = await session.request(input.tripRequestId);
    if (!request) return failure("REQUEST_NOT_FOUND");
    if (
      request.status === "InProgress" ||
      isTerminalTripRequestStatus(request.status)
    ) {
      return failure("REQUEST_TERMINAL");
    }

    const person = await session.person(passenger.passengerPersonId);
    if (!person) return failure("PERSON_NOT_FOUND");
    if (!person.isActive) return failure("PERSON_INACTIVE");

    const origin = await session.location(passenger.originLocationId);
    if (!origin) return failure("LOCATION_NOT_FOUND");
    if (origin.isActive === false) return failure("LOCATION_INACTIVE");

    const destination = await session.location(passenger.destinationLocationId);
    if (!destination) return failure("LOCATION_NOT_FOUND");
    if (destination.isActive === false) return failure("LOCATION_INACTIVE");

    const requestType = await session.requestType(request.tripRequestTypeId);
    if (requestType) {
      const groupingError = requestTypeGroupingError(requestType, [
        ...request.passengers.map((p) => ({
          passengerPersonId: p.passengerPersonId,
          originLocationId: p.originLocationId,
          destinationLocationId: p.destinationLocationId,
          requestedPickupDateTime: null,
          pickupOrder: null,
          dropoffOrder: null,
          status: null,
          description: null,
        })),
        passenger,
      ]);
      if (groupingError) return failure(groupingError);
    }

    const id = await session.createPassenger({
      tripRequestId: input.tripRequestId,
      passenger,
    });
    return { success: true, id };
  });
}

export async function updatePassenger(repository: TripRepository, input: {
    tripRequestId: number;
    tripId: number;
    passenger: TripPassengerInput;
  }): Promise<TripResult> {
  if (!isValidTripId(input.tripRequestId) || !isValidTripId(input.tripId)) {
    return failure("INVALID_ID");
  }
  const passenger = normalizeTripPassenger(input.passenger);
  const validationError = tripPassengerError(passenger);
  if (validationError) return failure(validationError);

  return repository.atomic(async (session) => {
    const trip = await session.trip(input.tripId);
    if (!trip || trip.requestId !== input.tripRequestId) {
      return failure("TRIP_NOT_FOUND");
    }
    const hasStarted = trip.executions.some(executionHasStarted);
    if (hasStarted) {
      if (
        trip.passengerPersonId !== passenger.passengerPersonId ||
        trip.originLocationId !== passenger.originLocationId ||
        trip.destinationLocationId !== passenger.destinationLocationId
      ) {
        return failure("PASSENGER_IN_USE");
      }
    }

    if (isTerminalTripRequestStatus(trip.requestStatus)) {
      return failure("REQUEST_TERMINAL");
    }

    const person = await session.person(passenger.passengerPersonId);
    if (!person) return failure("PERSON_NOT_FOUND");
    if (!person.isActive) return failure("PERSON_INACTIVE");

    const origin = await session.location(passenger.originLocationId);
    if (!origin) return failure("LOCATION_NOT_FOUND");
    if (origin.isActive === false) return failure("LOCATION_INACTIVE");

    const destination = await session.location(
      passenger.destinationLocationId,
    );
    if (!destination) return failure("LOCATION_NOT_FOUND");
    if (destination.isActive === false) return failure("LOCATION_INACTIVE");

    const request = await session.request(input.tripRequestId);
    if (request) {
      const requestType = await session.requestType(request.tripRequestTypeId);
      if (requestType) {
        const otherPassengers = request.passengers
          .filter((p) => p.tripId !== input.tripId)
          .map((p) => ({
            passengerPersonId: p.passengerPersonId,
            originLocationId: p.originLocationId,
            destinationLocationId: p.destinationLocationId,
            requestedPickupDateTime: null,
            pickupOrder: null,
            dropoffOrder: null,
            status: null,
            description: null,
          }));
        const groupingError = requestTypeGroupingError(requestType, [
          ...otherPassengers,
          passenger,
        ]);
        if (groupingError) return failure(groupingError);
      }
    }

    await session.updatePassenger({
      tripId: input.tripId,
      passenger,
    });
    return { success: true, id: input.tripId };
  });
}

export async function deletePassenger(repository: TripRepository, input: {
    tripRequestId: number;
    tripId: number;
  }): Promise<TripResult> {
  if (!isValidTripId(input.tripRequestId) || !isValidTripId(input.tripId)) {
    return failure("INVALID_ID");
  }

  return repository.atomic(async (session) => {
    const trip = await session.trip(input.tripId);
    if (!trip || trip.requestId !== input.tripRequestId) {
      return failure("TRIP_NOT_FOUND");
    }
    const hasHistory = trip.executions.some(
      (e) =>
        executionHasStarted(e) ||
        e.status === "Completed" ||
        e.actualDropoffDateTime !== null,
    );
    if (hasHistory) {
      return failure("PASSENGER_IN_USE");
    }

    const hasExecutionRoutes = trip.executions.some(
      (e) => e.routes && e.routes.length > 0,
    );
    if (hasExecutionRoutes) {
      return failure("PASSENGER_IN_USE");
    }

    if (
      trip.requestStatus === "InProgress" ||
      isTerminalTripRequestStatus(trip.requestStatus)
    ) {
      return failure("REQUEST_TERMINAL");
    }

    await session.deletePassenger(input.tripId);
    return { success: true, id: input.tripId };
  });
}
