import type { IncidentRepository } from "./incident-repository";
import type {
  IncidentFailure,
  IncidentResult,
  RecordAccidentCommand,
  RecordViolationCommand,
} from "./incident-records";
import { isTerminalTripRequestStatus } from "../trip-lifecycle";
import { isValidTripDate, isValidTripId } from "../trip-validation";

const failure = (error: IncidentFailure): IncidentResult => ({
  success: false,
  error,
});

function normalizeOptional(value: string | null): string | null {
  return value?.trim() || null;
}

function isUnsignedDecimal(
  value: string | null,
  maximumWholeDigits: number,
  fractionDigits: number,
): boolean {
  if (value === null) return true;
  const pattern = new RegExp(
    `^(?:0|[1-9]\\d{0,${maximumWholeDigits - 1}})(?:\\.\\d{1,${fractionDigits}})?$`,
  );
  return pattern.test(value);
}

function normalizeAccident(input: RecordAccidentCommand): RecordAccidentCommand {
  return {
    ...input,
    location: normalizeOptional(input.location),
    description: normalizeOptional(input.description),
    damageAmount: normalizeOptional(input.damageAmount),
    driverFaultPercent: normalizeOptional(input.driverFaultPercent),
    policeReportNo: normalizeOptional(input.policeReportNo),
  };
}

function accidentError(input: RecordAccidentCommand): IncidentFailure | null {
  if (!isValidTripId(input.tripRequestId)) return "INVALID_ID";
  if (
    input.vehicleAssignmentId !== null &&
    !isValidTripId(input.vehicleAssignmentId)
  ) {
    return "INVALID_ID";
  }
  if (!isValidTripDate(input.accidentDateTime)) return "INVALID_DATE";
  if ((input.location?.length ?? 0) > 300) return "LOCATION_TOO_LONG";
  if (!isUnsignedDecimal(input.damageAmount, 16, 2)) return "INVALID_DAMAGE";
  if (
    input.driverFaultPercent !== null &&
    !/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(input.driverFaultPercent)
  ) {
    return "INVALID_FAULT";
  }
  if ((input.policeReportNo?.length ?? 0) > 100) {
    return "POLICE_REPORT_TOO_LONG";
  }
  return null;
}

function normalizeViolation(
  input: RecordViolationCommand,
): RecordViolationCommand {
  return {
    ...input,
    violationType: input.violationType.trim(),
    location: normalizeOptional(input.location),
    amount: input.amount.trim(),
    referenceNo: normalizeOptional(input.referenceNo),
    description: normalizeOptional(input.description),
  };
}

function violationError(input: RecordViolationCommand): IncidentFailure | null {
  if (!isValidTripId(input.tripRequestId)) return "INVALID_ID";
  if (
    input.vehicleAssignmentId !== null &&
    !isValidTripId(input.vehicleAssignmentId)
  ) {
    return "INVALID_ID";
  }
  if (!isValidTripDate(input.violationDateTime)) return "INVALID_DATE";
  if (!input.violationType) return "VIOLATION_TYPE_REQUIRED";
  if (input.violationType.length > 150) return "VIOLATION_TYPE_TOO_LONG";
  if ((input.location?.length ?? 0) > 300) return "LOCATION_TOO_LONG";
  if (!isUnsignedDecimal(input.amount, 16, 2) || input.amount === "") {
    return "INVALID_AMOUNT";
  }
  if ((input.referenceNo?.length ?? 0) > 100) return "REFERENCE_TOO_LONG";
  return null;
}

async function assertRequestOwnership(
  session: {
    requestOwnership(
      tripRequestId: number,
    ): Promise<{ status: string; assignmentIds: number[] } | null>;
  },
  tripRequestId: number,
  vehicleAssignmentId: number | null,
): Promise<IncidentFailure | null> {
  const ownership = await session.requestOwnership(tripRequestId);
  if (!ownership) return "REQUEST_NOT_FOUND";
  if (isTerminalTripRequestStatus(ownership.status) && ownership.status === "Cancelled") {
    return "REQUEST_TERMINAL";
  }
  if (
    vehicleAssignmentId !== null &&
    !ownership.assignmentIds.includes(vehicleAssignmentId)
  ) {
    return "ASSIGNMENT_NOT_ON_REQUEST";
  }
  return null;
}

export class ManageIncidents {
  constructor(private readonly repository: IncidentRepository) {}

  async recordAccident(input: RecordAccidentCommand): Promise<IncidentResult> {
    const value = normalizeAccident(input);
    const error = accidentError(value);
    if (error) return failure(error);

    return this.repository.atomic(async (session) => {
      const ownershipError = await assertRequestOwnership(
        session,
        value.tripRequestId,
        value.vehicleAssignmentId,
      );
      if (ownershipError) return failure(ownershipError);
      return {
        success: true,
        id: await session.createAccident(value),
      };
    });
  }

  async recordViolation(
    input: RecordViolationCommand,
  ): Promise<IncidentResult> {
    const value = normalizeViolation(input);
    const error = violationError(value);
    if (error) return failure(error);

    return this.repository.atomic(async (session) => {
      const ownershipError = await assertRequestOwnership(
        session,
        value.tripRequestId,
        value.vehicleAssignmentId,
      );
      if (ownershipError) return failure(ownershipError);
      return {
        success: true,
        id: await session.createViolation(value),
      };
    });
  }
}
