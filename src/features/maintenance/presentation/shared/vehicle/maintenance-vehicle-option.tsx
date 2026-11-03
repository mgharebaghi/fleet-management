import { VehiclePlate } from "../../../../../components/ui/vehicle-plate/vehicle-plate";
import type { RequestVehicle } from "../../../application/requests/maintenance-request-records";
import styles from "./maintenance-vehicle-option.module.css";
export function maintenanceVehicleLabel(vehicle: RequestVehicle) {
  return `${vehicle.code} — ${vehicle.brandName} ${vehicle.modelName}${vehicle.isActive ? "" : " (غیرفعال)"}`;
}
export function MaintenanceVehicleOption({ vehicle }: { vehicle: RequestVehicle }) {
  return <span className={styles.vehicleOption}><span className={styles.vehicleLabel}>{maintenanceVehicleLabel(vehicle)}</span><span className={styles.vehiclePlate}><VehiclePlate vehicle={vehicle} /></span></span>;
}
