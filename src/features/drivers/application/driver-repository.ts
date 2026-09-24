import type { Assignment, DriverDetails, DriverSummary, License, NewAssignment, NewLicense, PersonReference, UpdatedAssignment, UpdatedLicense, VehicleReference } from "./driver-records";

export interface DriverSession {
  person(id: number): Promise<PersonReference | null>;
  driverForPerson(id: number): Promise<boolean>;
  driver(id: number): Promise<DriverSummary | null>;
  vehicle(id: number): Promise<VehicleReference | null>;
  licenses(id: number): Promise<License[]>;
  license(id: number): Promise<License | null>;
  licenseNumberExists(number: string, excludingLicenseId?: number): Promise<boolean>;
  overlap(input: NewAssignment, by: "driver" | "vehicle", excludingAssignmentId?: number): Promise<boolean>;
  /** Driver holding a current assignment of this vehicle, if one exists. Current means the period has started and has not ended, matching assignmentState. */
  currentAssignmentHolder(vehicleId: number, now: Date, excludingAssignmentId?: number): Promise<number | null>;
  assignment(id: number): Promise<Assignment | null>;
  createDriver(personId: number): Promise<number>;
  createLicense(input: NewLicense): Promise<number>;
  updateLicense(input: UpdatedLicense): Promise<void>;
  deleteLicense(id: number): Promise<void>;
  createAssignment(input: NewAssignment): Promise<number>;
  updateAssignment(input: UpdatedAssignment): Promise<void>;
  closeAssignment(id: number, end: Date, odometer: string | null): Promise<void>;
  deleteAssignment(id: number): Promise<void>;
}
export interface DriverRepository {
  // All reference checks and writes in the callback share one atomic operation.
  atomic<T>(work: (session: DriverSession) => Promise<T>): Promise<T>;
  list(search: string, page: number): Promise<{ drivers: DriverSummary[]; totalCount: number }>;
  details(id: number): Promise<DriverDetails | null>;
  availablePeople(): Promise<PersonReference[]>;
  availableVehicles(): Promise<VehicleReference[]>;
  /** Vehicles whose assignment period is current at `now`. Ended and future periods are omitted. */
  currentVehicleAssignments(now: Date): Promise<Array<{ vehicleId: number; assignmentId: number }>>;
}
