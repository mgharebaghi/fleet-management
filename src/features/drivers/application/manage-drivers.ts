import type { DriverRepository } from "./driver-repository";
import type { DriverFailure, DriverResult, NewAssignment, NewLicense } from "./driver-records";
import { assignmentError, licenseEligible, localDay, odometerError, validDate, validId } from "./assignment-rules";

const failure = (error: DriverFailure): DriverResult => ({ success: false, error });

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
    const value = { ...input, licenseType: input.licenseType.trim(), licenseNo: input.licenseNo.trim() };
    if (!validId(value.driverId)) return failure("INVALID_ID");
    if (!value.licenseType) return failure("LICENSE_TYPE_REQUIRED");
    if (value.licenseType.length > 100) return failure("LICENSE_TYPE_TOO_LONG");
    if (!value.licenseNo) return failure("LICENSE_NO_REQUIRED");
    if (value.licenseNo.length > 50) return failure("LICENSE_NO_TOO_LONG");
    for (const date of [value.issueDate, value.expireDate]) {
      if (date !== null && (!validDate(date) || date.toISOString().slice(11) !== "00:00:00.000Z")) return failure("INVALID_DATE");
    }
    if (value.issueDate && value.issueDate.toISOString().slice(0, 10) > localDay(this.now())) return failure("ISSUE_IN_FUTURE");
    if (value.issueDate && value.expireDate && value.expireDate < value.issueDate) return failure("EXPIRY_BEFORE_ISSUE");
    return this.repository.atomic(async session => {
      if (!await session.driver(value.driverId)) return failure("DRIVER_NOT_FOUND");
      if (await session.licenseNumberExists(value.licenseNo)) return failure("LICENSE_EXISTS");
      return { success: true, id: await session.createLicense(value) };
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
}
