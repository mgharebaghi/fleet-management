import type { CompletionReading } from "../../../application/work-orders/work-order-completion-records";
import { CompleteWorkOrderButton } from "./complete-work-order-button";
import { RepairTimeProgress } from "../../shared/repair-time/repair-time-progress";
import { ActionLink } from "@/components/ui/action-link/action-link";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { RecordSidePanel } from "../../../../../components/ui/record-workspace/record-workspace";
import { workOrderIsEditable, workOrderStatuses } from "../../../application/work-orders/work-order-records";
import { workOrderCostSummary } from "../../../application/work-order-costs/work-order-cost-summary";
import type { WorkTaskSnapshot } from "../../../application/work-order-tasks/work-order-task-records";
import type { WorkPartSnapshot } from "../../../application/work-order-parts/work-order-part-records";
import { orderStatusBadge } from "../shared/work-order-presentation";
import { CancelWorkOrderButton } from "./cancel-work-order-button";
import { StartWorkOrderButton } from "./start-work-order-button";
import styles from "./work-order-workspace.module.css";

export function WorkOrderSidebar({ snapshot, parts, section = "details", completionReadings = [] }: { snapshot: WorkTaskSnapshot; parts?: WorkPartSnapshot; completionReadings?: CompletionReading[]; section?: "details" | "tasks" | "parts" | "costs" }) {
  const { order, tasks } = snapshot;
  const items = parts?.items ?? [];
  const known = order.origin !== "Unknown" && workOrderStatuses.some(status => status === order.status);
  const editable = known && workOrderIsEditable(order.status);
  const costs = workOrderCostSummary(tasks, items);
  return <RecordSidePanel title="خلاصهٔ پرونده" summary={<div className={styles.status}><span>وضعیت پرونده</span><StatusBadge {...orderStatusBadge(order.status)} /></div>}>
    {editable && order.status === "Open" && order.startedAt === null && <StartWorkOrderButton id={order.id} number={order.number} />}
    {known && <RepairTimeProgress startedAt={order.startedAt} endedAt={order.endedAt} status={order.status} tasks={tasks.map(task => ({ status: task.status, hours: task.laborHours }))} />}
    {known && order.status === "InProgress" && order.startedAt !== null && order.endedAt === null && <CompleteWorkOrderButton id={order.id} number={order.number} service={order.origin === "Plan"} readings={completionReadings} />}
    {!known && <InlineNotice tone="danger" role="alert">وضعیت پرونده نامشخص است؛ تغییر اطلاعات ممکن نیست.</InlineNotice>}
    {costs.status !== "empty" && <section className={styles.operations} aria-label="خلاصهٔ هزینه‌ها">
      <h3>جمع مبلغ‌های مشخص‌شده</h3>
      <strong className={styles.costTotal}>{costs.status === "invalid" ? "قابل محاسبه نیست" : costs.total === null ? "هنوز مشخص نیست" : <><TechnicalValue>{formatDecimalAmount(costs.total)}</TechnicalValue> تومان</>}</strong>
      {costs.status === "incomplete" && <StatusBadge tone="warning" label="هزینه‌ها کامل نیست" />}
      {costs.status === "invalid" && <InlineNotice tone="danger" role="alert">مقدار یا مبلغ نامعتبر در سوابق وجود دارد.</InlineNotice>}
    </section>}
    {section === "details" && order.status !== "InProgress" && (editable || order.requestId != null) && <section className={styles.operations} aria-label="عملیات پرونده">
      <h3>عملیات پرونده</h3>
      {editable && <ActionLink href={`/maintenance/work-orders/${order.id}/edit`}>ویرایش اطلاعات و عیب‌یابی</ActionLink>}
      {order.requestId != null && <ActionLink href={`/maintenance/requests/${order.requestId}`}>مشاهدهٔ درخواست مرتبط</ActionLink>}
      {editable && order.status === "Open" && order.startedAt === null && <CancelWorkOrderButton id={order.id} number={order.number} started={false} />}
    </section>}
  </RecordSidePanel>;
}
