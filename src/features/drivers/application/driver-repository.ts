import type { Assignment, DriverDetails, DriverSummary, License, NewAssignment, NewLicense, PersonReference, VehicleReference } from "./driver-records";

export interface DriverSession {
  person(id: number): Promise<PersonReference | null>;
  driverForPerson(id: number): Promise<boolean>;
  driver(id: number): Promise<DriverSummary | null>;
  vehicle(id: number): Promise<VehicleReference | null>;
  licenses(id: number): Promise<License[]>;
  licenseNumberExists(number: string): Promise<boolean>;
  overlap(input: NewAssignment, by: "driver" | "vehicle"): Promise<boolean>;
  assignment(id: number): Promise<Assignment | null>;
  createDriver(personId: number): Promise<number>;
  createLicense(input: NewLicense): Promise<number>;
  createAssignment(input: NewAssignment): Promise<number>;
  closeAssignment(id: number, end: Date, odometer: string | null): Promise<void>;
}
export interface DriverRepository {
  // All reference checks and writes in the callback share one atomic operation.
  atomic<T>(work: (session: DriverSession) => Promise<T>): Promise<T>;
  list(search: string, page: number): Promise<{ drivers: DriverSummary[]; totalCount: number }>;
  details(id: number): Promise<DriverDetails | null>;
  availablePeople(): Promise<PersonReference[]>;
  availableVehicles(): Promise<VehicleReference[]>;
}
