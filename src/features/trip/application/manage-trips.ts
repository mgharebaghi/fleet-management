import type { TripRepository } from "./trip-repository";
import type {
  AssignInitialTripRequestCommand,
  CreateCompleteTripRequestCommand,
  CreateTripRequestCommand,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  SaveTripRouteInput,
  TripFailure,
  TripLocationInputFailure,
  TripLocationInputRole,
  TripPassengerInput,
  TripResult,
} from "./trip-records";
import {
  canTransitionTripExecution,
  canTransitionTripRequest,
  everyPassengerExecutionCompleted,
  everyPassengerHasPersistedPlan,
  executionHasStarted,
  isNonTerminalTripExecutionStatus,
  isTerminalTripRequestStatus,
  isTripExecutionStatus,
  isTripRequestStatus,
  jalaliYearOf,
  nextTripRequestNo,
  requestHasStartedExecution,
  type TripRequestStatus,
} from "./trip-lifecycle";
import {
  isValidTripDate,
  isValidTripId,
  normalizeTripExecution,
  normalizeTripPassenger,
  normalizeTripRequest,
  normalizeTripRoute,
  normalizeTripRouteDetails,
  requestTypeGroupingError,
  tripExecutionError,
  tripExecutionStateError,
  tripPassengerError,
  tripRequestError,
  tripRouteError,
  tripRouteDetailsError,
} from "./trip-validation";

const failure = (error: TripFailure, field?: string): TripResult => ({
  success: false,
  error,
  ...(field ? { field } : {}),
});

function locationInputFailure(
  error: "LOCATION_NOT_FOUND" | "LOCATION_INACTIVE",
  passengerIndex: number,
  locationRole: TripLocationInputRole,
): TripResult {
  const failedLocation: TripLocationInputFailure = {
    passengerIndex,
    locationRole,
  };
  return { success: false, error, failedLocation };
}

function assignmentFailure(
  assignment: {
    driverIsActive: boolean;
    vehicle: { isActive: boolean };
    hasEligibleLicense: boolean;
  },
  activeAt: Date,
  fromDateTime: Date,
  toDateTime: Date | null,
): TripFailure | null {
  if (!assignment.driverIsActive) return "DRIVER_INACTIVE";
  if (!assignment.vehicle.isActive) return "VEHICLE_INACTIVE";
  if (
    fromDateTime > activeAt ||
    (toDateTime !== null && activeAt >= toDateTime)
  ) {
    return "ASSIGNMENT_NOT_ACTIVE";
  }
  if (!assignment.hasEligibleLicense) return "NO_ELIGIBLE_LICENSE";
  return null;
}

export class ManageTrips {
  constructor(private readonly repository: TripRepository) {}

  async createRequest(input: CreateTripRequestCommand): Promise<TripResult> {
    const value = normalizeTripRequest({
      ...input,
      passengers: input.passengers.map((passenger) => ({
        ...passenger,
        // Requesters do not choose a passenger pickup time. Any supplied
        // value is discarded so every Trip inherits the request travel time.
        requestedPickupDateTime: input.requestedTravelDateTime,
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
    return this.repository.atomic(
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

  async createCompleteRequest(
    input: CreateCompleteTripRequestCommand,
  ): Promise<TripResult> {
    const value = normalizeTripRequest({
      ...input,
      passengers: input.passengers.map((passenger) => ({
        ...passenger,
        requestedPickupDateTime:
          passenger.requestedPickupDateTime ?? input.requestedTravelDateTime,
      })),
    });
    const routesByPassenger = input.passengers.map((passenger) =>
      passenger.routes.map(normalizeTripRouteDetails),
    );
    const requestValidationError = tripRequestError(value);
    if (requestValidationError) {
      return failure(
        requestValidationError,
        requestValidationError === "PURPOSE_TOO_LONG" ? "purpose" : undefined,
      );
    }
    for (const [passengerIndex, passenger] of input.passengers.entries()) {
      if (!isValidTripId(passenger.vehicleDriverAssignmentId)) {
        return failure("INVALID_ID", `passenger.${passengerIndex}.assignmentId`);
      }
      for (const route of routesByPassenger[passengerIndex]) {
        const routeError = tripRouteDetailsError(route);
        if (routeError) return failure(routeError);
      }
    }

    return this.repository.atomic(async (session) => {
      const requestDateTime = new Date();
      const jalaliYear = jalaliYearOf(requestDateTime);
      await session.lockRequestNumberYear(jalaliYear);
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

        const activeAt =
          passenger.requestedPickupDateTime ?? value.requestedTravelDateTime;
        const assignment = await session.assignment(
          input.passengers[passengerIndex].vehicleDriverAssignmentId,
          activeAt,
        );
        if (!assignment) return failure("ASSIGNMENT_NOT_FOUND");
        const assignmentError = assignmentFailure(
          assignment,
          activeAt,
          assignment.fromDateTime,
          assignment.toDateTime,
        );
        if (assignmentError) return failure(assignmentError);

        for (const route of routesByPassenger[passengerIndex]) {
          for (const point of route.points) {
            const location = await session.location(point.locationId);
            if (!location) return failure("LOCATION_NOT_FOUND");
            if (location.isActive === false) {
              return failure("LOCATION_INACTIVE");
            }
          }
        }
      }

      const created = await session.createRequest({
        ...value,
        requestDateTime,
        requestNo,
        status: "New",
      });
      if (created.tripIds.length !== value.passengers.length) {
        throw new Error("Created passenger Trip count did not match the command.");
      }

      for (const [passengerIndex, tripId] of created.tripIds.entries()) {
        await session.createExecution({
          tripId,
          tripExecutionId: null,
          vehicleDriverAssignmentId:
            input.passengers[passengerIndex].vehicleDriverAssignmentId,
          actualPickupDateTime: null,
          actualDropoffDateTime: null,
          startOdometer: null,
          endOdometer: null,
          status: "Planned",
          description: null,
        });

        for (const route of routesByPassenger[passengerIndex]) {
          if (route.isSelected) {
            await session.deselectOtherSelectedRoutes({
              tripId,
              tripExecutionId: null,
            });
          }
          await session.createRoute({
            ...route,
            tripId,
            tripExecutionId: null,
          });
        }
      }

      await session.updateRequestStatus(created.tripRequestId, "Assigned");
      return { success: true, id: created.tripRequestId };
    });
  }

  async assignInitialRequest(
    input: AssignInitialTripRequestCommand,
  ): Promise<TripResult> {
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

    return this.repository.atomic(async (session) => {
      const request = await session.request(input.tripRequestId);
      if (!request) return failure("REQUEST_NOT_FOUND");
      if (request.status !== "New") {
        return failure("INVALID_REQUEST_TRANSITION");
      }

      if (request.passengers.length !== input.passengers.length) {
        return failure("PASSENGER_REQUIRED");
      }

      for (const [passengerIndex, passengerInput] of input.passengers.entries()) {
        const trip = await session.trip(passengerInput.tripId);
        if (!trip || trip.requestId !== input.tripRequestId) {
          return failure("TRIP_NOT_FOUND");
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

  async addPassenger(input: {
    tripRequestId: number;
    passenger: TripPassengerInput;
  }): Promise<TripResult> {
    if (!isValidTripId(input.tripRequestId)) return failure("INVALID_ID");
    const passenger = normalizeTripPassenger(input.passenger);
    const validationError = tripPassengerError(passenger);
    if (validationError) return failure(validationError);

    return this.repository.atomic(async (session) => {
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

  async updatePassenger(input: {
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

    return this.repository.atomic(async (session) => {
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

  async deletePassenger(input: {
    tripRequestId: number;
    tripId: number;
  }): Promise<TripResult> {
    if (!isValidTripId(input.tripRequestId) || !isValidTripId(input.tripId)) {
      return failure("INVALID_ID");
    }

    return this.repository.atomic(async (session) => {
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

  async changeRequestStatus(
    tripRequestId: number,
    targetStatus: string,
  ): Promise<TripResult> {
    if (!isValidTripId(tripRequestId)) return failure("INVALID_ID");
    if (!isTripRequestStatus(targetStatus)) {
      return failure("INVALID_REQUEST_STATUS");
    }

    return this.repository.atomic(async (session) => {
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
        await session.startTripExecutions(tripRequestId);
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

  async startTrip(tripRequestId: number): Promise<TripResult> {
    return this.changeRequestStatus(tripRequestId, "InProgress");
  }

  async saveRoute(input: SaveTripRouteInput): Promise<TripResult> {
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

    return this.repository.atomic(async (session) => {
      const trip = await session.trip(value.tripId);
      if (!trip) return failure("TRIP_NOT_FOUND");
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

  async addRoute(input: NewTripRoute): Promise<TripResult> {
    return this.saveRoute({ ...input, routeId: null });
  }

  async deleteRoute(input: {
    tripRequestId: number;
    routeId: number;
  }): Promise<TripResult> {
    if (!isValidTripId(input.routeId) || !isValidTripId(input.tripRequestId)) {
      return failure("INVALID_ID");
    }

    return this.repository.atomic(async (session) => {
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

  async saveExecution(input: SaveTripExecutionInput): Promise<TripResult> {
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

    return this.repository.atomic(async (session) => {
      const trip = await session.trip(value.tripId);
      if (!trip) return failure("TRIP_NOT_FOUND");
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

  async saveSurvey(input: SavePassengerSurveyInput): Promise<TripResult> {
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

    return this.repository.atomic(async (session) => {
      const execution = await session.execution(value.tripExecutionId);
      if (!execution) return failure("EXECUTION_NOT_FOUND");
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
}
