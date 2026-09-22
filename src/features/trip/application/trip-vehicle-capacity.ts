/**
 * Passengers one physical vehicle may carry inside a single Trip Request.
 * Capacity is `vehicleId`, shared by every assignment of that vehicle.
 */
export const TRIP_REQUEST_VEHICLE_PASSENGER_LIMIT = 3;

function passengersByVehicle(
  vehicleIds: readonly number[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const vehicleId of vehicleIds) {
    counts.set(vehicleId, (counts.get(vehicleId) ?? 0) + 1);
  }
  return counts;
}

/** True when the submitted passengers put any vehicle over the request limit. */
export function tripRequestVehicleCapacityExceeded(
  vehicleIds: readonly number[],
): boolean {
  for (const count of passengersByVehicle(vehicleIds).values()) {
    if (count > TRIP_REQUEST_VEHICLE_PASSENGER_LIMIT) return true;
  }
  return false;
}

/**
 * Vehicles that already have no free passenger slot for someone else.
 * Callers must omit the passenger currently being edited.
 */
export function vehicleIdsWithoutPassengerRoom(
  vehicleIdsExcludingActivePassenger: readonly number[],
): ReadonlySet<number> {
  const full = new Set<number>();
  for (const [vehicleId, count] of passengersByVehicle(
    vehicleIdsExcludingActivePassenger,
  )) {
    if (count >= TRIP_REQUEST_VEHICLE_PASSENGER_LIMIT) {
      full.add(vehicleId);
    }
  }
  return full;
}
