import type { TripRepository } from "./trip-repository";
import type {
  CreateTripRequestCommand,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  TripFailure,
  TripResult,
} from "./trip-records";
import {
  canTransitionTripExecution,
  canTransitionTripRequest,
  isTripExecutionStatus,
  isTripRequestStatus,
  jalaliYearOf,
  nextTripRequestNo,
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
  tripRequestError,
  tripRouteError,
} from "./trip-validation";

const failure = (error: TripFailure): TripResult => ({
  success: false,
  error,
});

export class ManageTrips {
  constructor(private readonly repository: TripRepository) {}

  async createRequest(input: CreateTripRequestCommand): Promise<TripResult> {
    const value = normalizeTripRequest(input);
    const validationError = tripRequestError(value);
    if (validationError) return failure(validationError);

    return this.repository.atomic(async (session) => {
      const jalaliYear = jalaliYearOf(value.requestDateTime);
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

      for (const passenger of value.passengers) {
        const person = await session.person(passenger.passengerPersonId);
        if (!person) return failure("PERSON_NOT_FOUND");
        if (!person.isActive) return failure("PERSON_INACTIVE");

        for (const locationId of [
          passenger.originLocationId,
          passenger.destinationLocationId,
        ]) {
          const location = await session.location(locationId);
          if (!location) return failure("LOCATION_NOT_FOUND");
          if (location.isActive === false) return failure("LOCATION_INACTIVE");
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
      if (
        !canTransitionTripRequest(
          current.status,
          targetStatus,
          current.hasStartedExecution,
        )
      ) {
        return failure("INVALID_REQUEST_TRANSITION");
      }
      await session.updateRequestStatus(
        tripRequestId,
        targetStatus as TripRequestStatus,
      );
      return { success: true, id: tripRequestId };
    });
  }

  async addRoute(input: NewTripRoute): Promise<TripResult> {
    const value = normalizeTripRoute(input);
    const validationError = tripRouteError(value);
    if (validationError) return failure(validationError);

    return this.repository.atomic(async (session) => {
      if (!(await session.trip(value.tripId))) {
        return failure("TRIP_NOT_FOUND");
      }

      for (const point of value.points) {
        const location = await session.location(point.locationId);
        if (!location) return failure("LOCATION_NOT_FOUND");
        if (location.isActive === false) return failure("LOCATION_INACTIVE");
      }

      return {
        success: true,
        id: await session.createRoute(value),
      };
    });
  }

  async saveExecution(
    input: SaveTripExecutionInput,
  ): Promise<TripResult> {
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

    return this.repository.atomic(async (session) => {
      const trip = await session.trip(value.tripId);
      if (!trip) return failure("TRIP_NOT_FOUND");

      if (value.tripExecutionId !== null) {
        const execution = await session.execution(value.tripExecutionId);
        if (!execution || execution.tripId !== value.tripId) {
          return failure("EXECUTION_NOT_FOUND");
        }
        if (!isTripExecutionStatus(execution.status)) {
          return failure("INVALID_EXECUTION_STATUS");
        }
        if (
          !canTransitionTripExecution(
            execution.status,
            targetStatus,
            execution.actualPickupDateTime !== null ||
              value.actualPickupDateTime !== null,
          )
        ) {
          return failure("INVALID_EXECUTION_TRANSITION");
        }
      }

      const scheduledDateTime =
        trip.requestedPickupDateTime ?? trip.requestedTravelDateTime;
      const assignment = await session.assignment(
        value.vehicleDriverAssignmentId,
        scheduledDateTime,
      );
      if (!assignment) return failure("ASSIGNMENT_NOT_FOUND");

      if (
        assignment.fromDateTime > scheduledDateTime ||
        (assignment.toDateTime !== null &&
          scheduledDateTime >= assignment.toDateTime)
      ) {
        return failure("ASSIGNMENT_NOT_ACTIVE");
      }
      if (!assignment.hasEligibleLicense) {
        return failure("NO_ELIGIBLE_LICENSE");
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
      await session.updateSurvey(value);
      return { success: true, id: value.tripExecutionId };
    });
  }
}
