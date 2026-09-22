import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TripAssignmentReference } from "../../application/trip-records";
import {
  VEHICLE_CAPACITY_FULL_MESSAGE,
  buildEligibleAssignmentOptions,
} from "./assignment-capacity-options";

const passengers = [
  { key: 1 },
  { key: 2 },
  { key: 3 },
  { key: 4 },
];

function vehicle(vehicleId: number, vehicleCode: string) {
  return {
    vehicleId,
    vehicleCode,
    plateNoLeftSide: "۱۲",
    plateNoCenterChar: "ب",
    plateNoRightSide: "۳۴۵",
    plateNoIranNo: "۶۷",
    brandName: vehicleId === 5 ? "پژو" : "ایران خودرو",
    modelName: vehicleId === 5 ? "پارس" : "سمند",
    vehicleTypeName: null,
    vehicleStatusName: "فعال",
    isActive: true,
  };
}

function assignment(
  assignmentId: number,
  vehicleId: number,
  vehicleCode: string,
): TripAssignmentReference {
  return {
    assignmentId,
    fromDateTime: new Date("2026-01-01T00:00:00Z"),
    toDateTime: null,
    driverId: assignmentId,
    driverFirstName: "علی",
    driverLastName: "رضایی",
    driverPersonnelNo: "D-1",
    driverIsActive: true,
    hasEligibleLicense: true,
    vehicle: vehicle(vehicleId, vehicleCode),
  };
}

const vehicleAAssignments = [
  assignment(101, 5, "پارس-الف"),
  assignment(204, 5, "پارس-الف"),
  assignment(308, 5, "پارس-الف"),
  assignment(412, 5, "پارس-ب"),
];
const vehicleBAssignment = assignment(900, 8, "سمند-ب");

const assignmentsByPassenger: Record<number, TripAssignmentReference[]> = {
  1: vehicleAAssignments,
  2: vehicleAAssignments,
  3: [...vehicleAAssignments, vehicleBAssignment],
  4: [...vehicleAAssignments, vehicleBAssignment],
};

function optionsFor(
  activePassengerKey: number,
  selectedAssignments: Record<number, number>,
) {
  return buildEligibleAssignmentOptions({
    eligible: assignmentsByPassenger[activePassengerKey],
    passengers,
    assignmentsByPassenger,
    selectedAssignments,
    activePassengerKey,
  });
}

function optionFor(
  options: ReturnType<typeof optionsFor>,
  assignmentId: number,
) {
  return options.find((option) => option.value === String(assignmentId));
}

describe("assignment capacity options", () => {
  const threeOnVehicleA = { 1: 101, 2: 204, 3: 308 };

  it("disables every assignment of a vehicle already used by three other passengers", () => {
    const options = optionsFor(4, threeOnVehicleA);
    const primary = optionFor(options, 101);
    const sameVehicle = optionFor(options, 412);
    const otherVehicle = optionFor(options, 900);

    expect(primary?.disabled).toBe(true);
    expect(sameVehicle?.disabled).toBe(true);
    expect(otherVehicle?.disabled).toBe(false);
    expect(primary?.label).toContain(VEHICLE_CAPACITY_FULL_MESSAGE);
    expect(primary?.searchText).toContain("پارس-الف");
    expect(primary?.searchText).toContain(VEHICLE_CAPACITY_FULL_MESSAGE);

    const markup = renderToStaticMarkup(<>{primary?.content}</>);
    expect(markup).toContain("علی رضایی — پژو پارس — پارس-الف");
    expect(markup).toContain(VEHICLE_CAPACITY_FULL_MESSAGE);
    expect(markup).not.toContain("vehicleId");
    expect(markup).not.toContain(">5<");
    expect(markup).not.toContain(">101<");
  });

  it("keeps the active passenger's own vehicle selection available", () => {
    const options = optionsFor(2, threeOnVehicleA);
    const ownSelection = optionFor(options, 204);

    expect(ownSelection?.disabled).toBe(false);
    expect(renderToStaticMarkup(<>{ownSelection?.content}</>)).not.toContain(
      VEHICLE_CAPACITY_FULL_MESSAGE,
    );
  });

  it("releases vehicle capacity when another passenger changes vehicles", () => {
    expect(optionFor(optionsFor(4, threeOnVehicleA), 101)?.disabled).toBe(true);

    const released = optionsFor(4, { 1: 101, 2: 204, 3: 900 });
    expect(optionFor(released, 101)?.disabled).toBe(false);
    expect(optionFor(released, 412)?.disabled).toBe(false);
  });

  it("bases capacity on vehicleId rather than assignmentId", () => {
    const options = optionsFor(4, threeOnVehicleA);
    expect(optionFor(options, 101)?.disabled).toBe(true);
    expect(optionFor(options, 204)?.disabled).toBe(true);
    expect(optionFor(options, 308)?.disabled).toBe(true);
    expect(optionFor(options, 900)?.disabled).toBe(false);
  });
});
