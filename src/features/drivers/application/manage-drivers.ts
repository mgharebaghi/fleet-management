import type { DriverRepository } from "./driver-repository";
import type {
  DriverResult,
  NewAssignment,
  NewLicense,
  UpdatedAssignment,
  UpdatedLicense,
} from "./driver-records";

import { defineDriver } from "./profile/manage-drivers-profile";
import { addLicense, updateLicense, deleteLicense } from "./licenses/manage-drivers-licenses";
import {
  assignVehicle,
  closeAssignment,
  updateAssignment,
  deleteAssignment,
} from "./assignment/manage-drivers-assignment";

export class ManageDrivers {
  constructor(private readonly repository: DriverRepository, private readonly now: () => Date = () => new Date()) {}

  defineDriver(personId: number): Promise<DriverResult> {
    return defineDriver(this.repository, personId);
  }

  addLicense(input: NewLicense): Promise<DriverResult> {
    return addLicense(this.repository, this.now, input);
  }

  updateLicense(input: UpdatedLicense): Promise<DriverResult> {
    return updateLicense(this.repository, this.now, input);
  }

  deleteLicense(driverId: number, licenseId: number): Promise<DriverResult> {
    return deleteLicense(this.repository, driverId, licenseId);
  }

  assignVehicle(input: NewAssignment): Promise<DriverResult> {
    return assignVehicle(this.repository, this.now, input);
  }

  closeAssignment(id: number, end: Date, odometer: string | null, expectedDriverId?: number): Promise<DriverResult> {
    return closeAssignment(this.repository, id, end, odometer, expectedDriverId);
  }

  updateAssignment(input: UpdatedAssignment): Promise<DriverResult> {
    return updateAssignment(this.repository, this.now, input);
  }

  deleteAssignment(driverId: number, assignmentId: number): Promise<DriverResult> {
    return deleteAssignment(this.repository, this.now, driverId, assignmentId);
  }
}
