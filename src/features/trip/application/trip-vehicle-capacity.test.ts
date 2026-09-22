import { describe, expect, it } from "vitest";

import {
  TRIP_REQUEST_VEHICLE_PASSENGER_LIMIT,
  tripRequestVehicleCapacityExceeded,
  vehicleIdsWithoutPassengerRoom,
} from "./trip-vehicle-capacity";

describe("trip vehicle passenger capacity", () => {
  it("keeps the request limit at three passengers per vehicle", () => {
    expect(TRIP_REQUEST_VEHICLE_PASSENGER_LIMIT).toBe(3);
  });

  it("allows exactly three passengers on one vehicle", () => {
    expect(tripRequestVehicleCapacityExceeded([5, 5, 5])).toBe(false);
  });

  it("rejects a fourth passenger even when assignment identity is not the key", () => {
    expect(tripRequestVehicleCapacityExceeded([5, 5, 5, 5])).toBe(true);
  });

  it("allows three passengers on one vehicle and another passenger on a different vehicle", () => {
    expect(tripRequestVehicleCapacityExceeded([5, 5, 5, 8])).toBe(false);
  });

  it("marks a vehicle full only after other passengers already use every slot", () => {
    expect(vehicleIdsWithoutPassengerRoom([5, 5])).toEqual(new Set());
    expect(vehicleIdsWithoutPassengerRoom([5, 5, 5])).toEqual(new Set([5]));
    expect(vehicleIdsWithoutPassengerRoom([5, 5, 5, 8])).toEqual(new Set([5]));
  });
});