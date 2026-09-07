import type { DriverRepository } from "./driver-repository";
import type { DriverFailure, DriverResult, NewAssignment, NewLicense, UpdatedAssignment, UpdatedLicense } from "./driver-records";
import { assignmentError, assignmentState, licenseEligible, localDay, odometerError, validDate, validId } from "./assignment-rules";

const failure = (error: DriverFailure): DriverResult => ({ success: false, error });

function normalizedLicense(input: NewLicense): NewLicense {
  return { ...input, licenseType: input.licenseType.trim(), licenseNo: input.licenseNo.trim() };
}

function licenseError(value: NewLicense, now: Date): DriverFailure | null {
  if (!validId(value.driverId)) return "INVALID_ID";
  if (!value.licenseType) return "LICENSE_TYPE_REQUIRED";
  if (value.licenseType.length > 100) return "LICENSE_TYPE_TOO_LONG";
  if (!value.licenseNo) return "LICENSE_NO_REQUIRED";
  if (value.licenseNo.length > 50) return "LICENSE_NO_TOO_LONG";
  for (const date of [value.issueDate, value.expireDate]) {
    if (date !== null && (!validDate(date) || date.toISOString().slice(11) !== "00:00:00.000Z")) return "INVALID_DATE";
  }
  if (value.issueDate && value.issueDate.toISOString().slice(0, 10) > localDay(now)) return "ISSUE_IN_FUTURE";
  if (value.issueDate && value.expireDate && value.expireDate < value.issueDate) return "EXPIRY_BEFORE_ISSUE";
  return null;
}

export class ManageDrivers {
  constructor(private readonly repository: DriverRepository, private readonly now: () => Date = () => new Date()) {}

  async defineDriver(personId: number): Promise<DriverResult> {
    if (!validId(personId)) return failure("INVALID_ID");
    return this.repository.atomic(async session => {
      const person = await session.person(personId);
      if (!person) return failure("PERSON_NOT_FOUND");
      if (!person.isActive) return failure("PERSON_INACTIVE");
      if (await session.driverForPerson(personId)) return failure("DRIVER_EXISTS");
      return { success: true, id: await session.createDriver(personId) };
    });
  }

  async addLicense(input: NewLicense): Promise<DriverResult> {
    const value = normalizedLicense(input);
    const error = licenseError(value, this.now());
    if (error) return failure(error);
    return this.repository.atomic(async session => {
      if (!await session.driver(value.driverId)) return failure("DRIVER_NOT_FOUND");
      if (await session.licenseNumberExists(value.licenseNo)) return failure("LICENSE_EXISTS");
      return { success: true, id: await session.createLicense(value) };
    });
  }

  async updateLicense(input: UpdatedLicense): Promise<DriverResult> {
    if (!validId(input.licenseId)) return failure("INVALID_ID");
    const value: UpdatedLicense = { ...input, ...normalizedLicense(input) };
    const error = licenseError(value, this.now());
    if (error) return failure(error);
    return this.repository.atomic(async session => {
      const existing = await session.license(value.licenseId);
      if (!existing || existing.driverId !== value.driverId) return failure("LICENSE_NOT_FOUND");
      if (await session.licenseNumberExists(value.licenseNo, value.licenseId)) return failure("LICENSE_EXISTS");
      await session.updateLicense(value);
      return { success: true, id: value.licenseId };
    });
  }

  async deleteLicense(driverId: number, licenseId: number): Promise<DriverResult> {
    if (!validId(driverId) || !validId(licenseId)) return failure("INVALID_ID");
    return this.repository.atomic(async session => {
      const existing = await session.license(licenseId);
      if (!existing || existing.driverId !== driverId) return failure("LICENSE_NOT_FOUND");
      await session.deleteLicense(licenseId);
      return { success: true, id: licenseId };
    });
  }

  async assignVehicle(input: NewAssignment): Promise<DriverResult> {
    const value = { ...input, description: input.description?.trim() || null };
    const error = assignmentError(value);
    if (error) return failure(error);
    return this.repository.atomic(async session => {
      const driver = await session.driver(value.driverId);
      if (!driver) return failure("DRIVER_NOT_FOUND");
      if (!driver.isActive) return failure("PERSON_INACTIVE");
      const vehicle = await session.vehicle(value.vehicleId);
      if (!vehicle) return failure("VEHICLE_NOT_FOUND");
      if (!vehicle.isActive) return failure("VEHICLE_INACTIVE");
      if (!(await session.licenses(value.driverId)).some(license => licenseEligible(license, value.fromDateTime))) return failure("NO_ELIGIBLE_LICENSE");
      if (await session.overlap(value, "driver")) return failure("DRIVER_OVERLAP");
      if (await session.overlap(value, "vehicle")) return failure("VEHICLE_OVERLAP");
      return { success: true, id: await session.createAssignment(value) };
    });
  }

  async closeAssignment(id: number, end: Date, odometer: string | null): Promise<DriverResult> {
    if (!validId(id)) return failure("INVALID_ID");
    if (!validDate(end)) return failure("INVALID_DATE");
    return this.repository.atomic(async session => {
      const assignment = await session.assignment(id);
      if (!assignment) return failure("ASSIGNMENT_NOT_FOUND");
      if (assignment.toDateTime !== null) return failure("ASSIGNMENT_CLOSED");
      if (end <= assignment.fromDateTime) return failure("INVALID_PERIOD");
      const error = odometerError(assignment.startOdometer, odometer);
      if (error) return failure(error);
      await session.closeAssignment(id, end, odometer);
      return { success: true, id };
    });
  }

  async updateAssignment(input: UpdatedAssignment): Promise<DriverResult> {
    if (!validId(input.assignmentId)) return failure("INVALID_ID");
    const value = { ...input, description: input.description?.trim() || null };
    const error = assignmentError(value);
    if (error) return failure(error);
    return this.repository.atomic(async session => {
      const existing = await session.assignment(value.assignmentId);
      if (!existing || existing.driverId !== value.driverId) return failure("ASSIGNMENT_NOT_FOUND");
      if (assignmentState(existing, this.now()) === "past") return failure("ASSIGNMENT_IMMUTABLE");
      const driver = await session.driver(value.driverId);
      if (!driver) return failure("DRIVER_NOT_FOUND");
      if (!driver.isActive) return failure("PERSON_INACTIVE");
      const vehicle = await session.vehicle(value.vehicleId);
      if (!vehicle) return failure("VEHICLE_NOT_FOUND");
      if (!vehicle.isActive) return failure("VEHICLE_INACTIVE");
      if (!(await session.licenses(value.driverId)).some(license => licenseEligible(license, value.fromDateTime))) return failure("NO_ELIGIBLE_LICENSE");
      if (await session.overlap(value, "driver", value.assignmentId)) return failure("DRIVER_OVERLAP");
      if (await session.overlap(value, "vehicle", value.assignmentId)) return failure("VEHICLE_OVERLAP");
      await session.updateAssignment(value);
      return { success: true, id: value.assignmentId };
    });
  }

  async deleteAssignment(driverId: number, assignmentId: number): Promise<DriverResult> {
    if (!validId(driverId) || !validId(assignmentId)) return failure("INVALID_ID");
    return this.repository.atomic(async session => {
      const existing = await session.assignment(assignmentId);
      if (!existing || existing.driverId !== driverId) return failure("ASSIGNMENT_NOT_FOUND");
      if (assignmentState(existing, this.now()) === "past") return failure("ASSIGNMENT_NOT_DELETABLE");
      await session.deleteAssignment(assignmentId);
      return { success: true, id: assignmentId };
    });
  }
}
