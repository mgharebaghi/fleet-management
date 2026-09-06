import type { SearchableSelectOption } from "../../../../../components/ui/searchable-select/searchable-select-options";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import type { InsuranceVehicle } from "../../../application/vehicle-insurances/vehicle-insurance";
import { VehiclePlate } from "../../vehicles/list-vehicles/vehicle-plate";
import styles from "./vehicle-options.module.css";

function plateText(vehicle: InsuranceVehicle): string {
  return `${vehicle.plateNoLeftSide} ${vehicle.plateNoCenterChar ?? "—"} ${vehicle.plateNoRightSide ?? "—"} / ${vehicle.plateNoIranNo ?? "—"}`;
}

/** Vehicles sharing brand, model and plate need their code shown to tell them apart. */
function findAmbiguousVehicleIds(vehicles: readonly InsuranceVehicle[]): Set<number> {
  const countByKey = new Map<string, number>();
  for (const vehicle of vehicles) {
    const key = `${vehicle.brandName}|${vehicle.modelName}|${plateText(vehicle)}`;
    countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
  }
  const ambiguous = new Set<number>();
  for (const vehicle of vehicles) {
    const key = `${vehicle.brandName}|${vehicle.modelName}|${plateText(vehicle)}`;
    if ((countByKey.get(key) ?? 0) > 1) {
      ambiguous.add(vehicle.vehicleId);
    }
  }
  return ambiguous;
}

/**
 * Turns the vehicle read model into searchable-select options: brand/model as
 * the main line, the plate as a readable secondary line, and the vehicle code
 * only when brand/model/plate alone cannot tell two vehicles apart. The
 * dropdown row (`content`) stays two lines; the closed trigger gets its own
 * single-line `triggerContent` so a selection does not grow the form's row height.
 */
export function buildVehicleOptions(vehicles: readonly InsuranceVehicle[]): SearchableSelectOption[] {
  const ambiguousVehicleIds = findAmbiguousVehicleIds(vehicles);

  return vehicles.map((vehicle) => {
    const showCode = ambiguousVehicleIds.has(vehicle.vehicleId);
    return {
      value: String(vehicle.vehicleId),
      label: `${vehicle.brandName} ${vehicle.modelName} — ${plateText(vehicle)}${showCode ? ` — کد ${vehicle.vehicleCode}` : ""}${vehicle.isActive ? "" : " (غیرفعال)"}`,
      searchText: `${vehicle.brandName} ${vehicle.modelName} ${vehicle.vehicleCode} ${plateText(vehicle)}`,
      content: (
        <span className={styles.option}>
          <span className={styles.mainLine}>
            {vehicle.brandName} {vehicle.modelName}
            {!vehicle.isActive && <StatusBadge label="غیرفعال" tone="negative" />}
          </span>
          <span className={styles.secondaryLine}>
            <VehiclePlate vehicle={vehicle} />
            {showCode && <span className={styles.vehicleCode}>کد {vehicle.vehicleCode}</span>}
          </span>
        </span>
      ),
      triggerContent: (
        <span className={styles.trigger}>
          <span className={styles.triggerName}>{vehicle.brandName} {vehicle.modelName}</span>
          <span className={styles.triggerMeta}>
            <VehiclePlate vehicle={vehicle} />
            {!vehicle.isActive && <StatusBadge label="غیرفعال" tone="negative" />}
            {showCode && <span className={styles.vehicleCode}>کد {vehicle.vehicleCode}</span>}
          </span>
        </span>
      ),
    };
  });
}
