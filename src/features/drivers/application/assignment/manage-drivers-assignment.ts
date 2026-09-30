import type { DriverRepository } from "../driver-repository";
import type { DriverResult, NewAssignment, UpdatedAssignment } from "../driver-records";
import {
  assignmentError,
  assignmentState,
  licenseEligible,
  odometerError,
  validDate,
  validId,
} from "../assignment-rules";
import { failure } from "../drivers-write-rules";

export async function assignVehicle(repository: DriverRepository, now: () => Date, input: NewAssignment): Promise<DriverResult> {
  const value = { ...input, description: input.description?.trim() || null };
  const error = assignmentError(value);
  if (error) return failure(error);
  return repository.atomic(async session => {
    const driver = await session.driver(value.driverId);
    if (!driver) return failure("DRIVER_NOT_FOUND");
    if (!driver.isActive) return failure("PERSON_INACTIVE");
    const vehicle = await session.vehicle(value.vehicleId);
    if (!vehicle) return failure("VEHICLE_NOT_FOUND");
    if (!vehicle.isActive) return failure("VEHICLE_INACTIVE");
    if (!(await session.licenses(value.driverId)).some(license => licenseEligible(license, value.fromDateTime))) return failure("NO_ELIGIBLE_LICENSE");
    const holder = await session.currentAssignmentHolder(value.vehicleId, now());
    if (holder !== null && holder !== value.driverId) return failure("VEHICLE_CURRENTLY_ASSIGNED");
    if (await session.overlap(value, "driver")) return failure("DRIVER_OVERLAP");
    if (await session.overlap(value, "vehicle")) return failure("VEHICLE_OVERLAP");
    if (holder === value.driverId) return failure("VEHICLE_CURRENTLY_ASSIGNED");
    return { success: true, id: await session.createAssignment(value) };
  });
}

export async function closeAssignment(repository: DriverRepository, id: number, end: Date, odometer: string | null, expectedDriverId?: number): Promise<DriverResult> {
  if (!validId(id)) return failure("INVALID_ID");
  if (!validDate(end)) return failure("INVALID_DATE");
  return repository.atomic(async session => {
    const assignment = await session.assignment(id);
    if (!assignment || (expectedDriverId !== undefined && assignment.driverId !== expectedDriverId)) return failure("ASSIGNMENT_NOT_FOUND");
    if (assignment.toDateTime !== null) return failure("ASSIGNMENT_CLOSED");
    if (end <= assignment.fromDateTime) return failure("INVALID_PERIOD");
    const error = odometerError(assignment.startOdometer, odometer);
    if (error) return failure(error);
    await session.closeAssignment(id, end, odometer);
    return { success: true, id };
  });
}

export async function updateAssignment(repository: DriverRepository, now: () => Date, input: UpdatedAssignment): Promise<DriverResult> {
  if (!validId(input.assignmentId)) return failure("INVALID_ID");
  const value = { ...input, description: input.description?.trim() || null };
  const error = assignmentError(value);
  if (error) return failure(error);
  return repository.atomic(async session => {
    const existing = await session.assignment(value.assignmentId);
    if (!existing || existing.driverId !== value.driverId) return failure("ASSIGNMENT_NOT_FOUND");
    if (assignmentState(existing, now()) === "past") return failure("ASSIGNMENT_IMMUTABLE");
    const changesIdentityOrWindow = existing.vehicleId !== value.vehicleId ||
      existing.fromDateTime.getTime() !== value.fromDateTime.getTime() ||
      existing.toDateTime?.getTime() !== value.toDateTime?.getTime();
    if (changesIdentityOrWindow && await session.assignmentHasTripExecutions(value.assignmentId)) return failure("ASSIGNMENT_IN_USE");
    const driver = await session.driver(value.driverId);
    if (!driver) return failure("DRIVER_NOT_FOUND");
    if (!driver.isActive) return failure("PERSON_INACTIVE");
    const vehicle = await session.vehicle(value.vehicleId);
    if (!vehicle) return failure("VEHICLE_NOT_FOUND");
    if (!vehicle.isActive) return failure("VEHICLE_INACTIVE");
    if (!(await session.licenses(value.driverId)).some(license => licenseEligible(license, value.fromDateTime))) return failure("NO_ELIGIBLE_LICENSE");
    const holder = await session.currentAssignmentHolder(value.vehicleId, now(), value.assignmentId);
    if (holder !== null && holder !== value.driverId) return failure("VEHICLE_CURRENTLY_ASSIGNED");
    if (await session.overlap(value, "driver", value.assignmentId)) return failure("DRIVER_OVERLAP");
    if (await session.overlap(value, "vehicle", value.assignmentId)) return failure("VEHICLE_OVERLAP");
    if (holder === value.driverId) return failure("VEHICLE_CURRENTLY_ASSIGNED");
    await session.updateAssignment(value);
    return { success: true, id: value.assignmentId };
  });
}

export async function deleteAssignment(repository: DriverRepository, now: () => Date, driverId: number, assignmentId: number): Promise<DriverResult> {
  if (!validId(driverId) || !validId(assignmentId)) return failure("INVALID_ID");
  return repository.atomic(async session => {
    const existing = await session.assignment(assignmentId);
    if (!existing || existing.driverId !== driverId) return failure("ASSIGNMENT_NOT_FOUND");
    if (assignmentState(existing, now()) === "past") return failure("ASSIGNMENT_NOT_DELETABLE");
    await session.deleteAssignment(assignmentId);
    return { success: true, id: assignmentId };
  });
}
