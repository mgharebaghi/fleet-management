import type { TripRepository } from "../trip-repository";
import type { AssignInitialTripRequestCommand, TripResult } from "../trip-records";
import { isNonTerminalTripExecutionStatus } from "../trip-lifecycle";
import {
  isValidTripId,
  normalizeTripRouteDetails,
  tripRouteDetailsError,
} from "../trip-validation";
import { vehiclePassengerCapacityExceeded } from "../trip-vehicle-capacity";
import { failure, assignmentFailure } from "../trip-write-rules";

export async function assignInitialRequest(repository: TripRepository, input: AssignInitialTripRequestCommand): Promise<TripResult> {
  if (!isValidTripId(input.tripRequestId)) return failure("INVALID_ID");
  if (!Array.isArray(input.passengers) || input.passengers.length === 0) {
    return failure("PASSENGER_REQUIRED");
  }

  const normalizedRoutesByPassenger = input.passengers.map((passenger) =>
    (passenger.routes ?? []).map(normalizeTripRouteDetails),
  );

  for (const [passengerIndex, passenger] of input.passengers.entries()) {
    if (!isValidTripId(passenger.tripId)) {
      return failure("INVALID_ID", `passenger.${passengerIndex}.tripId`);
    }
    if (!isValidTripId(passenger.vehicleDriverAssignmentId)) {
      return failure(
        "INVALID_ID",
        `passenger.${passengerIndex}.assignmentId`,
      );
    }
    for (const route of normalizedRoutesByPassenger[passengerIndex]) {
      const routeError = tripRouteDetailsError(route);
      if (routeError) return failure(routeError);
    }
  }

  return repository.atomic(async (session) => {
    const request = await session.request(input.tripRequestId);
    if (!request) return failure("REQUEST_NOT_FOUND");
    if (request.status !== "New") {
      return failure("INVALID_REQUEST_TRANSITION");
    }

    if (request.passengers.length !== input.passengers.length) {
      return failure("PASSENGER_REQUIRED");
    }

    const passengerIds = new Set(input.passengers.map(passenger => passenger.tripId));
    if (passengerIds.size !== input.passengers.length || request.passengers.some(passenger => !passengerIds.has(passenger.tripId))) {
      return failure("INVALID_ASSIGNMENT_PASSENGERS");
    }

    const resolvedVehicleIds: number[] = [];
    for (const [passengerIndex, passengerInput] of input.passengers.entries()) {
      const trip = await session.trip(passengerInput.tripId);
      if (!trip || trip.requestId !== input.tripRequestId) {
        return failure("TRIP_NOT_FOUND");
      }
      if (trip.executions.some(execution => isNonTerminalTripExecutionStatus(execution.status))) {
        return failure("ACTIVE_EXECUTION_EXISTS");
      }

      const scheduledDateTime =
        trip.requestedPickupDateTime ?? trip.requestedTravelDateTime;
      const assignment = await session.assignment(
        passengerInput.vehicleDriverAssignmentId,
        scheduledDateTime,
      );
      if (!assignment) return failure("ASSIGNMENT_NOT_FOUND");

      const assignmentError = assignmentFailure(
        assignment,
        scheduledDateTime,
        assignment.fromDateTime,
        assignment.toDateTime,
      );
      if (assignmentError) return failure(assignmentError);
      resolvedVehicleIds.push(assignment.vehicle.vehicleId);

      for (const route of normalizedRoutesByPassenger[passengerIndex]) {
        for (const point of route.points) {
          const location = await session.location(point.locationId);
          if (!location) return failure("LOCATION_NOT_FOUND");
          if (location.isActive === false) {
            return failure("LOCATION_INACTIVE");
          }
        }
      }
    }

    // A New request has no TripExecutions yet, so persisted occupancy is
    // other requests only and these passengers are counted once, below.
    const persistedActiveCounts =
      await session.activePassengerCountsByVehicle([
        ...new Set(resolvedVehicleIds),
      ]);
    if (
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts,
        submittedVehicleIds: resolvedVehicleIds,
      })
    ) {
      return failure("VEHICLE_PASSENGER_CAPACITY_EXCEEDED");
    }

    for (const [passengerIndex, passengerInput] of input.passengers.entries()) {
      await session.createExecution({
        tripId: passengerInput.tripId,
        tripExecutionId: null,
        vehicleDriverAssignmentId: passengerInput.vehicleDriverAssignmentId,
        actualPickupDateTime: null,
        actualDropoffDateTime: null,
        startOdometer: null,
        endOdometer: null,
        status: "Planned",
        description: null,
      });

      for (const route of normalizedRoutesByPassenger[passengerIndex]) {
        if (route.isSelected) {
          await session.deselectOtherSelectedRoutes({
            tripId: passengerInput.tripId,
            tripExecutionId: null,
          });
        }
        await session.createRoute({
          ...route,
          tripId: passengerInput.tripId,
          tripExecutionId: null,
        });
      }
    }

    await session.updateRequestStatus(input.tripRequestId, "Assigned");
    return { success: true, id: input.tripRequestId };
  });
}
