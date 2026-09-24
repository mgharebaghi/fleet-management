import { StatusBadge } from "../../../components/ui/status-badge/status-badge";
import type { SearchableSelectOption } from "../../../components/ui/searchable-select/searchable-select-options";
import { buildVehicleOptions } from "../../fleet/presentation/vehicle-insurances/create-vehicle-insurance/vehicle-options";
import type { VehicleReference } from "../application/driver-records";

export const VEHICLE_UNAVAILABLE_LABEL = "در دسترس نیست";

export function vehicleIsCurrentlyAssigned(
  currentAssignments: readonly { vehicleId: number; assignmentId: number }[],
  vehicleId: number,
  excludingAssignmentId?: number,
): boolean {
  return currentAssignments.some(row => row.vehicleId === vehicleId && row.assignmentId !== excludingAssignmentId);
}

export function buildAssignmentVehicleOptions(
  vehicles: readonly VehicleReference[],
  currentAssignments: readonly { vehicleId: number; assignmentId: number }[],
  excludingAssignmentId?: number,
): SearchableSelectOption[] {
  return buildVehicleOptions(vehicles).map((option, index) => {
    const vehicle = vehicles[index];
    if (!vehicle || !vehicleIsCurrentlyAssigned(currentAssignments, vehicle.vehicleId, excludingAssignmentId)) return option;
    return {
      ...option,
      disabled: true,
      label: `${option.label} — ${VEHICLE_UNAVAILABLE_LABEL}`,
      searchText: option.searchText,
      content: (
        <span>
          {option.content}
          <StatusBadge label={VEHICLE_UNAVAILABLE_LABEL} tone="warning" />
        </span>
      ),
    };
  });
}
