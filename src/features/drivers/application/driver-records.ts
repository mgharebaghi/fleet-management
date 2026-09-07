export type PersonReference = { personId: number; firstName: string; lastName: string; personnelNo: string | null; nationalCode: string | null; isActive: boolean };
export type DriverSummary = PersonReference & { driverId: number };
export type VehicleReference = {
  vehicleId: number; vehicleCode: string; plate: string; isActive: boolean;
  brandName: string; modelName: string; vehicleTypeName: string | null;
  plateNoLeftSide: string; plateNoCenterChar: string | null; plateNoRightSide: string | null; plateNoIranNo: string | null;
};
export type NewLicense = { driverId: number; licenseType: string; licenseNo: string; issueDate: Date | null; expireDate: Date | null; isActive: boolean };
export type License = NewLicense & { licenseId: number };
export type NewAssignment = { driverId: number; vehicleId: number; fromDateTime: Date; toDateTime: Date | null; startOdometer: string | null; endOdometer: string | null; description: string | null };
export type Assignment = NewAssignment & { assignmentId: number; vehicle: VehicleReference };
export type DriverDetails = DriverSummary & { licenses: License[]; assignments: Assignment[] };
export type DriverFailure = "INVALID_ID" | "PERSON_NOT_FOUND" | "PERSON_INACTIVE" | "DRIVER_EXISTS" | "DRIVER_NOT_FOUND" | "LICENSE_TYPE_REQUIRED" | "LICENSE_TYPE_TOO_LONG" | "LICENSE_NO_REQUIRED" | "LICENSE_NO_TOO_LONG" | "LICENSE_EXISTS" | "INVALID_DATE" | "ISSUE_IN_FUTURE" | "EXPIRY_BEFORE_ISSUE" | "VEHICLE_NOT_FOUND" | "VEHICLE_INACTIVE" | "NO_ELIGIBLE_LICENSE" | "INVALID_PERIOD" | "INVALID_ODOMETER" | "ODOMETER_DECREASE" | "DESCRIPTION_TOO_LONG" | "DRIVER_OVERLAP" | "VEHICLE_OVERLAP" | "ASSIGNMENT_NOT_FOUND" | "ASSIGNMENT_CLOSED";
export type DriverResult = { success: true; id: number } | { success: false; error: DriverFailure };
