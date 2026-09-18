import type {
  CreateTripRequestCommand,
  NewTripRoute,
  SaveTripExecutionInput,
  TripFailure,
  TripPassengerInput,
  TripRequestTypeReference,
} from "./trip-records";

const SQL_INT_MIN = -2_147_483_648;
const SQL_INT_MAX = 2_147_483_647;

export function isValidTripId(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= SQL_INT_MAX;
}

export function isValidTripDate(value: Date): boolean {
  return (
    value instanceof Date &&
    Number.isFinite(value.getTime()) &&
    value.getUTCFullYear() >= 1 &&
    value.getUTCFullYear() <= 9999
  );
}

function isSqlInt(value: number): boolean {
  return (
    Number.isInteger(value) && value >= SQL_INT_MIN && value <= SQL_INT_MAX
  );
}

function normalizeOptional(value: string | null): string | null {
  return value?.trim() || null;
}

export function normalizeTripRequest(
  input: CreateTripRequestCommand,
): CreateTripRequestCommand {
  return {
    ...input,
    purpose: normalizeOptional(input.purpose),
    description: normalizeOptional(input.description),
    passengers: input.passengers.map((passenger) => ({
      ...passenger,
      status: normalizeOptional(passenger.status),
      description: normalizeOptional(passenger.description),
    })),
  };
}

function passengerError(passenger: TripPassengerInput): TripFailure | null {
  if (
    !isValidTripId(passenger.passengerPersonId) ||
    !isValidTripId(passenger.originLocationId) ||
    !isValidTripId(passenger.destinationLocationId)
  ) {
    return "INVALID_ID";
  }

  if (
    passenger.requestedPickupDateTime !== null &&
    !isValidTripDate(passenger.requestedPickupDateTime)
  ) {
    return "INVALID_DATE";
  }

  if (
    (passenger.pickupOrder !== null && !isSqlInt(passenger.pickupOrder)) ||
    (passenger.dropoffOrder !== null && !isSqlInt(passenger.dropoffOrder))
  ) {
    return "INVALID_ORDER";
  }

  if ((passenger.status?.length ?? 0) > 50) {
    return "TRIP_STATUS_TOO_LONG";
  }

  return null;
}

export function tripRequestError(
  input: CreateTripRequestCommand,
): TripFailure | null {
  if (!isValidTripId(input.tripRequestTypeId)) return "INVALID_ID";
  if (
    !isValidTripDate(input.requestDateTime) ||
    !isValidTripDate(input.requestedTravelDateTime)
  ) {
    return "INVALID_DATE";
  }
  if ((input.purpose?.length ?? 0) > 500) return "PURPOSE_TOO_LONG";
  if (input.passengers.length === 0) return "PASSENGER_REQUIRED";

  for (const passenger of input.passengers) {
    const error = passengerError(passenger);
    if (error) return error;
  }

  return null;
}

export function requestTypeGroupingError(
  requestType: TripRequestTypeReference,
  passengers: TripPassengerInput[],
): TripFailure | null {
  const [first] = passengers;
  if (!first) return "PASSENGER_REQUIRED";

  if (
    (requestType.typeCode === "COMMON_ORIGIN" ||
      requestType.typeCode === "COMMON_ORIGIN_DESTINATION") &&
    passengers.some(
      (passenger) =>
        passenger.originLocationId !== first.originLocationId,
    )
  ) {
    return "COMMON_ORIGIN_REQUIRED";
  }

  if (
    (requestType.typeCode === "COMMON_DESTINATION" ||
      requestType.typeCode === "COMMON_ORIGIN_DESTINATION") &&
    passengers.some(
      (passenger) =>
        passenger.destinationLocationId !== first.destinationLocationId,
    )
  ) {
    return "COMMON_DESTINATION_REQUIRED";
  }

  return null;
}

function isUnsignedDecimal(
  value: string | null,
  maximumWholeDigits: number,
): boolean {
  if (value === null) return true;
  const pattern = new RegExp(
    `^(?:0|[1-9]\\d{0,${maximumWholeDigits - 1}})(?:\\.\\d{1,2})?$`,
  );
  return pattern.test(value);
}

function decimalHundredths(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"))
  );
}

export function normalizeTripRoute(input: NewTripRoute): NewTripRoute {
  return {
    ...input,
    routeName: input.routeName.trim(),
    description: normalizeOptional(input.description),
    points: input.points.map((point) => ({
      ...point,
      trafficZone: normalizeOptional(point.trafficZone),
      description: normalizeOptional(point.description),
    })),
  };
}

export function tripRouteError(input: NewTripRoute): TripFailure | null {
  if (!isValidTripId(input.tripId)) return "INVALID_ID";
  if (
    input.tripExecutionId !== null &&
    !isValidTripId(input.tripExecutionId)
  ) {
    return "INVALID_ID";
  }
  if (!input.routeName) return "ROUTE_NAME_REQUIRED";
  if (input.routeName.length > 200) return "ROUTE_NAME_TOO_LONG";
  if (
    input.alternativeNo !== null &&
    (!isSqlInt(input.alternativeNo) || input.alternativeNo <= 0)
  ) {
    return "INVALID_ROUTE_NUMBER";
  }
  if (!isUnsignedDecimal(input.distanceKm, 8)) return "INVALID_DISTANCE";
  if (
    input.estimatedDurationMinute !== null &&
    (!isSqlInt(input.estimatedDurationMinute) ||
      input.estimatedDurationMinute < 0)
  ) {
    return "INVALID_DURATION";
  }

  for (const point of input.points) {
    if (!isValidTripId(point.locationId)) return "INVALID_ID";
    if (
      point.sequenceNo !== null &&
      (!isSqlInt(point.sequenceNo) || point.sequenceNo <= 0)
    ) {
      return "INVALID_SEQUENCE";
    }
    if (!isUnsignedDecimal(point.distanceFromStartKm, 8)) {
      return "INVALID_DISTANCE";
    }
    if ((point.trafficZone?.length ?? 0) > 50) {
      return "TRAFFIC_ZONE_TOO_LONG";
    }
  }

  return null;
}

export function normalizeTripExecution(
  input: SaveTripExecutionInput,
): SaveTripExecutionInput {
  return {
    ...input,
    startOdometer: normalizeOptional(input.startOdometer),
    endOdometer: normalizeOptional(input.endOdometer),
    status: input.status.trim(),
    description: normalizeOptional(input.description),
  };
}

export function tripExecutionError(
  input: SaveTripExecutionInput,
): TripFailure | null {
  if (
    !isValidTripId(input.tripId) ||
    !isValidTripId(input.vehicleDriverAssignmentId) ||
    (input.tripExecutionId !== null &&
      !isValidTripId(input.tripExecutionId))
  ) {
    return "INVALID_ID";
  }

  for (const date of [
    input.actualPickupDateTime,
    input.actualDropoffDateTime,
  ]) {
    if (date !== null && !isValidTripDate(date)) return "INVALID_DATE";
  }

  if (
    input.actualPickupDateTime !== null &&
    input.actualDropoffDateTime !== null &&
    input.actualDropoffDateTime < input.actualPickupDateTime
  ) {
    return "INVALID_EXECUTION_PERIOD";
  }

  if (
    !isUnsignedDecimal(input.startOdometer, 16) ||
    !isUnsignedDecimal(input.endOdometer, 16)
  ) {
    return "INVALID_ODOMETER";
  }

  if (input.endOdometer !== null && input.startOdometer === null) {
    return "MISSING_START_ODOMETER";
  }

  if (
    input.startOdometer !== null &&
    input.endOdometer !== null &&
    decimalHundredths(input.endOdometer) <
      decimalHundredths(input.startOdometer)
  ) {
    return "ODOMETER_DECREASE";
  }

  return null;
}

export function tripExecutionStateError(
  input: SaveTripExecutionInput,
): TripFailure | null {
  const hasPickup = input.actualPickupDateTime !== null;
  const hasDropoff = input.actualDropoffDateTime !== null;
  const hasStartOdometer = input.startOdometer !== null;
  const hasEndOdometer = input.endOdometer !== null;
  const impliesStart = hasPickup || hasDropoff || hasStartOdometer || hasEndOdometer;

  switch (input.status) {
    case "Planned":
      return impliesStart ? "UNEXPECTED_ACTUAL_START" : null;
    case "InProgress":
      if (!hasPickup) return "MISSING_ACTUAL_PICKUP";
      if (hasDropoff) return "UNEXPECTED_ACTUAL_DROPOFF";
      return null;
    case "Completed":
      if (!hasPickup) return "MISSING_ACTUAL_PICKUP";
      if (!hasDropoff) return "MISSING_ACTUAL_DROPOFF";
      return null;
    case "Cancelled":
      return impliesStart ? "UNEXPECTED_ACTUAL_START" : null;
    default:
      return "INVALID_EXECUTION_STATUS";
  }
}
