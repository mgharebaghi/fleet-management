import { FormSection } from "../../../../../components/ui/form-field/form-field";
import type { WorkOrderRecord } from "../../../application/work-orders/work-order-records";
import { MaintenanceRecordSummary } from "../../shared/record/maintenance-record-summary";
import { requestDateFormatter } from "../../requests/shared/request-presentation";
import styles from "../../shared/record/maintenance-record.module.css";
import { CancelWorkOrderButton } from "./cancel-work-order-button";
export function WorkOrderResultPanel({ order }: { order: WorkOrderRecord }) {
  if (order.status === "InProgress") return order.origin !== "Unknown" && order.startedAt !== null && order.endedAt === null ? <FormSection title="توقف تعمیر"><CancelWorkOrderButton id={order.id} number={order.number} started /></FormSection> : null;
  return <FormSection title="نتیجهٔ تعمیر">
    {order.status === "Open" && <p>تعمیر هنوز شروع نشده است.</p>}
    {order.endedAt && <MaintenanceRecordSummary fields={[["زمان پایان", requestDateFormatter.format(new Date(order.endedAt))], ["نتیجهٔ نهایی", <span key="result" className={styles.text}>{order.finalDescription ?? "ثبت نشده"}</span>]]} />}
  </FormSection>;
}
