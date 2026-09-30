import { tehranDateTimeInputs as dateTimeInputs } from "../../../../shared/presentation/tehran-date-time";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { StatusTimeline } from "../../../../components/ui/status-timeline/status-timeline";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { IconActionGroup } from "../../../../components/ui/icon-action-button/icon-action-button";
import { VehiclePlate } from "../../../../components/ui/vehicle-plate/vehicle-plate";
import type { Assignment, VehicleReference } from "../../application/driver-records";
import { DriverForm } from "../driver-form";
import { DriverFormDialog } from "../driver-form-dialog";
import { DeleteAssignmentButton } from "./delete-assignment-dialog";
import { getAssignmentProgress, getAssignmentTimeStatus } from "./assignment-time-status";
import styles from "../driver-pages.module.css";

const timeFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" });
const timestamp = (d: Date | null) => d ? timeFormatter.format(d) : "باز";
const tehranDateTimeInputs = (date: Date | null, prefix: "from" | "to") => {
  const { day, time } = dateTimeInputs(date);
  return { [`${prefix}Day`]: day, [`${prefix}Time`]: time };
};

export function AssignmentContent({ assignment: a, now, state, vehicles, currentAssignments }: { assignment: Assignment; now: Date; state: "future" | "current" | "past"; vehicles: VehicleReference[]; currentAssignments: readonly { vehicleId: number; assignmentId: number }[] }) {
  const timeStatus = getAssignmentTimeStatus(a, now);
  const progress = getAssignmentProgress(a, now);
  // Historical records remain immutable; Application also protects assignments referenced by trips.
  const editable = state !== "past";
  const openEndedCurrent = state === "current" && a.toDateTime === null;
  const initialValues = { vehicleId: String(a.vehicleId), ...tehranDateTimeInputs(a.fromDateTime, "from"), ...tehranDateTimeInputs(a.toDateTime, "to"), startOdometer: a.startOdometer ?? "", endOdometer: a.endOdometer ?? "", description: a.description ?? "" };
  return <article className={state === "current" ? `${styles.assignment} ${styles.assignmentCurrent}` : styles.assignment} data-testid={`assignment-${a.assignmentId}`}>
    <div className={styles.assignmentHeader}>
      <h3>{a.vehicle.brandName} {a.vehicle.modelName}</h3>
      <div className={styles.assignmentHeaderActions}>
        <StatusBadge label={timeStatus.label} tone={timeStatus.tone} />
        {openEndedCurrent && <DriverFormDialog triggerLabel="پایان تخصیص" dialogTitle="ثبت پایان تخصیص" titleId={`close-assignment-${a.assignmentId}-title`} size="list">
          <DriverForm kind="close" driverId={a.driverId} assignmentId={a.assignmentId} />
        </DriverFormDialog>}
        {editable && <IconActionGroup>
          <DriverFormDialog iconTrigger triggerLabel={`ویرایش تخصیص ${a.vehicle.vehicleCode}`} dialogTitle="ویرایش تخصیص خودرو" titleId={`edit-assignment-${a.assignmentId}-title`} size="list">
            <DriverForm kind="editAssignment" driverId={a.driverId} assignmentId={a.assignmentId} vehicles={vehicles} currentAssignments={currentAssignments} initialValues={initialValues} />
          </DriverFormDialog>
          <DeleteAssignmentButton driverId={a.driverId} assignmentId={a.assignmentId} vehicleLabel={`${a.vehicle.brandName} ${a.vehicle.modelName} — ${a.vehicle.vehicleCode}`} />
        </IconActionGroup>}
      </div>
    </div>
    <div className={styles.assignmentMeta}>
      <VehiclePlate vehicle={a.vehicle} />
      <span>کد خودرو: <TechnicalValue>{a.vehicle.vehicleCode}</TechnicalValue></span>
    </div>
    <StatusTimeline tone={timeStatus.tone} statusLabel={timeStatus.label}
      startLabel={`از ${timestamp(a.fromDateTime)}`}
      endLabel={a.toDateTime === null ? "بدون زمان پایان" : `تا ${timestamp(a.toDateTime)}`}
      progress={progress} />
    <div className={styles.assignmentMeta}>
      <span>کیلومتر: <TechnicalValue>{a.startOdometer ?? "—"}</TechnicalValue> — <TechnicalValue>{a.endOdometer ?? "—"}</TechnicalValue></span>
    </div>
    {a.description && <p className={styles.assignmentNote}>{a.description}</p>}
  </article>;
}
