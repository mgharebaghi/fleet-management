import { describe, expect, it } from "vitest";

import {
  VEHICLE_ACTIVE_PASSENGER_LIMIT,
  vehicleIdsWithoutPassengerRoom,
  vehiclePassengerCapacityExceeded,
} from "./trip-vehicle-capacity";

describe("trip vehicle passenger capacity", () => {
  it("keeps the active passenger limit at three per vehicle", () => {
    expect(VEHICLE_ACTIVE_PASSENGER_LIMIT).toBe(3);
  });

  it("allows persisted occupancy plus the current submission up to three", () => {
    expect(
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts: {},
        submittedVehicleIds: [5, 5, 5],
      }),
    ).toBe(false);
    expect(
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts: { 5: 1 },
        submittedVehicleIds: [5, 5],
      }),
    ).toBe(false);
    expect(
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts: { 5: 2 },
        submittedVehicleIds: [5],
      }),
    ).toBe(false);
  });

  it("rejects when persisted occupancy plus the submission exceeds three", () => {
    expect(
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts: { 5: 3 },
        submittedVehicleIds: [5],
      }),
    ).toBe(true);
    expect(
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts: { 5: 2 },
        submittedVehicleIds: [5, 5],
      }),
    ).toBe(true);
  });

  it("does not add occupancy from a different vehicle", () => {
    expect(
      vehiclePassengerCapacityExceeded({
        persistedActiveCounts: { 5: 3, 8: 1 },
        submittedVehicleIds: [8],
      }),
    ).toBe(false);
  });

  it("treats a vehicle as full from persisted occupancy and other wizard selections", () => {
    expect(
      vehicleIdsWithoutPassengerRoom({
        persistedActiveCounts: { 5: 3 },
        wizardVehicleIdsExcludingActivePassenger: [],
      }),
    ).toEqual(new Set([5]));
    expect(
      vehicleIdsWithoutPassengerRoom({
        persistedActiveCounts: { 5: 2 },
        wizardVehicleIdsExcludingActivePassenger: [5],
      }),
    ).toEqual(new Set([5]));
    expect(
      vehicleIdsWithoutPassengerRoom({
        persistedActiveCounts: { 5: 2 },
        wizardVehicleIdsExcludingActivePassenger: [],
      }),
    ).toEqual(new Set());
  });
});