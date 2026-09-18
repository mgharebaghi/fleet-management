import { describe, expect, it } from "vitest";

import {
  assignmentIneligibilityReasons,
  isAssignmentEligible,
} from "./trip-assignment-eligibility";
import type { TripAssignmentReference } from "./trip-records";

const activeAt = new Date("2026-02-01T08:00:00Z");

const assignment: TripAssignmentReference = {
  assignmentId: 1,
  fromDateTime: new Date("2026-01-01T00:00:00Z"),
  toDateTime: new Date("2026-03-01T00:00:00Z"),
  driverId: 1,
  driverFirstName: "Test",
  driverLastName: "Driver",
  driverPersonnelNo: "D-1",
  driverIsActive: true,
  hasEligibleLicense: true,
  vehicle: {
    vehicleId: 1,
    vehicleCode: "V-1",
    plateNoLeftSide: "12",
    plateNoCenterChar: "ب",
    plateNoRightSide: "345",
    plateNoIranNo: "67",
    brandName: "Brand",
    modelName: "Model",
    vehicleTypeName: null,
    vehicleStatusName: "Operational",
    isActive: true,
  },
};

describe("Trip assignment eligibility", () => {
  it("accepts an active driver, vehicle, window and license", () => {
    expect(isAssignmentEligible(assignment, activeAt)).toBe(true);
    expect(assignmentIneligibilityReasons(assignment, activeAt)).toEqual([]);
  });

  it("never treats an inactive driver or vehicle as eligible", () => {
    expect(
      assignmentIneligibilityReasons(
        { ...assignment, driverIsActive: false },
        activeAt,
      ),
    ).toEqual(["INACTIVE_DRIVER"]);
    expect(
      assignmentIneligibilityReasons(
        {
          ...assignment,
          vehicle: { ...assignment.vehicle, isActive: false },
        },
        activeAt,
      ),
    ).toEqual(["INACTIVE_VEHICLE"]);
  });

  it("uses the half-open assignment window and license at trip time", () => {
    expect(
      assignmentIneligibilityReasons(
        { ...assignment, toDateTime: activeAt },
        activeAt,
      ),
    ).toEqual(["INACTIVE_TIME_RANGE"]);
    expect(
      assignmentIneligibilityReasons(
        { ...assignment, hasEligibleLicense: false },
        activeAt,
      ),
    ).toEqual(["INVALID_LICENSE"]);
  });
});
