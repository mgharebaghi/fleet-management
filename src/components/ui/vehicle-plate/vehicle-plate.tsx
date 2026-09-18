import styles from "./vehicle-plate.module.css";

type VehiclePlateParts = {
  plateNoLeftSide: string;
  plateNoCenterChar: string | null;
  plateNoRightSide: string | null;
  plateNoIranNo: string | null;
};

/**
 * Iranian plates read left to right even inside the RTL page, and legacy rows
 * may still miss parts, so the order is written out instead of inferred.
 */
export function VehiclePlate({ vehicle }: { vehicle: VehiclePlateParts }) {
  return (
    <span className={styles.plate} dir="ltr">
      <span className={styles.platePart}>{vehicle.plateNoLeftSide}</span>
      <span className={styles.platePart}>
        {vehicle.plateNoCenterChar ?? "—"}
      </span>
      <span className={styles.platePart}>
        {vehicle.plateNoRightSide ?? "—"}
      </span>
      <span className={styles.plateIran}>
        <span className={styles.plateIranLabel}>ایران</span>
        <span>{vehicle.plateNoIranNo ?? "—"}</span>
      </span>
    </span>
  );
}
