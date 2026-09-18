import type { TripRepository } from "./trip-repository";
import type {
  CreateTripRequestCommand,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  TripFailure,
  TripLocationInputFailure,
  TripLocationInputRole,
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
  normalizeTripRequest,
  normalizeTripRoute,
  requestTypeGroupingError,
  tripExecutionError,
  tripExecutionStateError,
  tripRequestError,
  tripRouteError,
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
    const value = normalizeTripRequest(input);
    const validationError = tripRequestError(value);
    if (validationError) {
      return failure(
        validationError,
        validationError === "PURPOSE_TOO_LONG" ? "purpose" : undefined,
      );
    }

    const jalaliYear = jalaliYearOf(value.requestDateTime);
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

        return {
          success: true,
          id: await session.createRequest({
            ...value,
            requestNo,
            status: "New",
          }),
        };
      },
      { requestNoYear: jalaliYear },
    );
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
      if (targetStatus === "InProgress" && !hasStartedExecution) {
        return failure("EXECUTION_NOT_STARTED");
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

  async addRoute(input: NewTripRoute): Promise<TripResult> {
    const value = normalizeTripRoute({
      ...input,
      tripExecutionId: input.tripExecutionId ?? null,
    });
    const validationError = tripRouteError(value);
    if (validationError) return failure(validationError);

    return this.repository.atomic(async (session) => {
      const trip = await session.trip(value.tripId);
      if (!trip) return failure("TRIP_NOT_FOUND");
      if (isTerminalTripRequestStatus(trip.requestStatus)) {
        return failure("REQUEST_TERMINAL");
      }
      if (value.tripExecutionId !== null) {
        const execution = await session.execution(value.tripExecutionId);
        if (!execution || execution.tripId !== value.tripId) {
          return failure("EXECUTION_NOT_FOUND");
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

      return {
        success: true,
        id: await session.createRoute(value),
      };
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
      await session.updateSurvey(value);
      return { success: true, id: value.tripExecutionId };
    });
  }
}
