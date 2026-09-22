import type { SearchableSelectOption } from "@/components/ui/searchable-select/searchable-select-options";
import { vehicleIdsWithoutPassengerRoom } from "../../application/trip-vehicle-capacity";
import type { TripAssignmentReference } from "../../application/trip-records";
import styles from "./create-trip.module.css";

export const VEHICLE_CAPACITY_FULL_MESSAGE = "ظرفیت خودرو تکمیل شده";

type AssignmentCapacityPassenger = {
  key: number;
};

export function assignmentOptionLabel(assignment: TripAssignmentReference) {
  return `${assignment.driverFirstName} ${assignment.driverLastName} — ${assignment.vehicle.brandName} ${assignment.vehicle.modelName} — ${assignment.vehicle.vehicleCode}`;
}

function selectedVehicleIdsExcludingPassenger(
  passengers: readonly AssignmentCapacityPassenger[],
  assignmentsByPassenger: Readonly<
    Record<number, readonly TripAssignmentReference[]>
  >,
  selectedAssignments: Readonly<Record<number, number>>,
  activePassengerKey: number,
): number[] {
  const vehicleIds: number[] = [];
  for (const passenger of passengers) {
    if (passenger.key === activePassengerKey) continue;
    const assignmentId = selectedAssignments[passenger.key];
    if (assignmentId === undefined) continue;
    const assignment = (assignmentsByPassenger[passenger.key] ?? []).find(
      (item) => item.assignmentId === assignmentId,
    );
    if (!assignment) continue;
    vehicleIds.push(assignment.vehicle.vehicleId);
  }
  return vehicleIds;
}

export function buildEligibleAssignmentOptions(input: {
  eligible: readonly TripAssignmentReference[];
  passengers: readonly AssignmentCapacityPassenger[];
  assignmentsByPassenger: Readonly<
    Record<number, readonly TripAssignmentReference[]>
  >;
  selectedAssignments: Readonly<Record<number, number>>;
  activePassengerKey: number;
  activePassengerCountsByVehicle: Readonly<Record<number, number>>;
}): SearchableSelectOption[] {
  const fullVehicleIds = vehicleIdsWithoutPassengerRoom({
    persistedActiveCounts: input.activePassengerCountsByVehicle,
    wizardVehicleIdsExcludingActivePassenger: selectedVehicleIdsExcludingPassenger(
      input.passengers,
      input.assignmentsByPassenger,
      input.selectedAssignments,
      input.activePassengerKey,
    ),
  });

  return input.eligible.map((assignment) => {
    const label = assignmentOptionLabel(assignment);
    const capacityDisabled = fullVehicleIds.has(assignment.vehicle.vehicleId);
    return {
      value: String(assignment.assignmentId),
      label: capacityDisabled
        ? `${label} — ${VEHICLE_CAPACITY_FULL_MESSAGE}`
        : label,
      searchText: `${label} ${assignment.driverPersonnelNo ?? ""} ${
        capacityDisabled ? VEHICLE_CAPACITY_FULL_MESSAGE : ""
      }`.trim(),
      disabled: capacityDisabled,
      content: (
        <span className={styles.assignmentOption}>
          <span>{label}</span>
          {capacityDisabled ? (
            <span className={styles.capacityFullNote}>
              {VEHICLE_CAPACITY_FULL_MESSAGE}
            </span>
          ) : null}
        </span>
      ),
      triggerContent: <span>{label}</span>,
    };
  });
}
