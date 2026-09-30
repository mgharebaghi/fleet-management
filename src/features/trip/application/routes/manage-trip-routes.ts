import type { TripRepository } from "../trip-repository";
import type { NewTripRoute, SaveTripRouteInput, TripResult } from "../trip-records";
import { isTerminalTripRequestStatus } from "../trip-lifecycle";
import { isValidTripId, normalizeTripRoute, tripRouteError } from "../trip-validation";

import { failure } from "../trip-write-rules";

export async function saveRoute(repository: TripRepository, input: SaveTripRouteInput, expectedTripRequestId?: number): Promise<TripResult> {
  const { routeId, ...routeFields } = input;
  const value = normalizeTripRoute({
    ...routeFields,
    tripExecutionId: input.tripExecutionId ?? null,
  });
  const validationError = tripRouteError(value);
  if (validationError) return failure(validationError);
  if (
    routeId !== null &&
    routeId !== undefined &&
    !isValidTripId(routeId)
  ) {
    return failure("INVALID_ID");
  }

  return repository.atomic(async (session) => {
    const trip = await session.trip(value.tripId);
    if (!trip || (expectedTripRequestId !== undefined && trip.requestId !== expectedTripRequestId)) return failure("TRIP_NOT_FOUND");
    if (
      value.tripExecutionId === null &&
      (trip.requestStatus === "InProgress" ||
        isTerminalTripRequestStatus(trip.requestStatus))
    ) {
      return failure("REQUEST_TERMINAL");
    }
    if (
      value.tripExecutionId !== null &&
      isTerminalTripRequestStatus(trip.requestStatus)
    ) {
      return failure("REQUEST_TERMINAL");
    }
    if (value.tripExecutionId !== null) {
      const execution = await session.execution(value.tripExecutionId);
      if (!execution || execution.tripId !== value.tripId) {
        return failure("EXECUTION_NOT_FOUND");
      }
    }

    if (input.routeId !== null && input.routeId !== undefined) {
      const existingRoute = await session.route(input.routeId);
      if (!existingRoute) return failure("ROUTE_NOT_FOUND");
      if (existingRoute.tripId !== value.tripId) {
        return failure("TRIP_NOT_FOUND");
      }
      if (existingRoute.tripExecutionId !== null) {
        return failure("ROUTE_IN_USE");
      }
    }

    for (const point of value.points) {
      const location = await session.location(point.locationId);
      if (!location) return failure("LOCATION_NOT_FOUND");
      if (location.isActive === false) return failure("LOCATION_INACTIVE");
    }

    if (value.isSelected) {
      await session.deselectOtherSelectedRoutes({
        tripId: value.tripExecutionId === null ? value.tripId : null,
        tripExecutionId: value.tripExecutionId,
      });
    }

    if (input.routeId !== null && input.routeId !== undefined) {
      await session.updateRoute({
        ...value,
        routeId: input.routeId,
      });
      return {
        success: true,
        id: input.routeId,
      };
    }

    return {
      success: true,
      id: await session.createRoute(value),
    };
  });
}

export async function addRoute(repository: TripRepository, input: NewTripRoute): Promise<TripResult> {
  return saveRoute(repository, { ...input, routeId: null });
}

export async function deleteRoute(repository: TripRepository, input: {
    tripRequestId: number;
    routeId: number;
  }): Promise<TripResult> {
  if (!isValidTripId(input.routeId) || !isValidTripId(input.tripRequestId)) {
    return failure("INVALID_ID");
  }

  return repository.atomic(async (session) => {
    const existingRoute = await session.route(input.routeId);
    if (!existingRoute) return failure("ROUTE_NOT_FOUND");

    if (existingRoute.tripId !== null) {
      const trip = await session.trip(existingRoute.tripId);
      if (!trip || trip.requestId !== input.tripRequestId) {
        return failure("REQUEST_NOT_FOUND");
      }
      if (
        trip.requestStatus === "InProgress" ||
        isTerminalTripRequestStatus(trip.requestStatus)
      ) {
        return failure("REQUEST_TERMINAL");
      }
    }

    if (existingRoute.tripExecutionId !== null) {
      return failure("ROUTE_IN_USE");
    }

    await session.deleteRoute(input.routeId);
    return { success: true, id: input.routeId };
  });
}
