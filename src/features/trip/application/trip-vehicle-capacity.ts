/**
 * Active passengers one physical vehicle may carry across all trip requests.
 * Capacity is `vehicleId`. Planned and InProgress executions occupy a slot;
 * Completed and Cancelled executions do not.
 */
export const VEHICLE_ACTIVE_PASSENGER_LIMIT = 3;

function passengersByVehicle(
  vehicleIds: readonly number[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const vehicleId of vehicleIds) {
    counts.set(vehicleId, (counts.get(vehicleId) ?? 0) + 1);
  }
  return counts;
}

export function vehiclePassengerCapacityExceeded(input: {
  persistedActiveCounts: Readonly<Record<number, number>>;
  submittedVehicleIds: readonly number[];
}): boolean {
  const submitted = passengersByVehicle(input.submittedVehicleIds);
  for (const [vehicleId, submittedCount] of submitted) {
    const total =
      (input.persistedActiveCounts[vehicleId] ?? 0) + submittedCount;
    if (total > VEHICLE_ACTIVE_PASSENGER_LIMIT) return true;
  }
  return false;
}

/**
 * Vehicles with no free slot for someone else.
 * Wizard ids must omit the passenger currently being edited.
 * Missing persisted keys mean zero active occupancy.
 */
export function vehicleIdsWithoutPassengerRoom(input: {
  persistedActiveCounts: Readonly<Record<number, number>>;
  wizardVehicleIdsExcludingActivePassenger: readonly number[];
}): ReadonlySet<number> {
  const wizard = passengersByVehicle(
    input.wizardVehicleIdsExcludingActivePassenger,
  );
  const vehicleIds = new Set<number>([
    ...Object.keys(input.persistedActiveCounts).map(Number),
    ...wizard.keys(),
  ]);
  const full = new Set<number>();
  for (const vehicleId of vehicleIds) {
    const total =
      (input.persistedActiveCounts[vehicleId] ?? 0) +
      (wizard.get(vehicleId) ?? 0);
    if (total >= VEHICLE_ACTIVE_PASSENGER_LIMIT) {
      full.add(vehicleId);
    }
  }
  return full;
}
