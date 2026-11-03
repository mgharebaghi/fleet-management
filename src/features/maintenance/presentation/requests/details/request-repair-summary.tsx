import { RepairTimeProgress } from "../../shared/repair-time/repair-time-progress";
import { ActionLink } from "@/components/ui/action-link/action-link";
import { RecordProgress } from "@/components/ui/record-workspace/record-workspace";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type { RequestOrder } from "../../../application/requests/maintenance-request-records";
import { orderStatusBadge } from "../../work-orders/shared/work-order-presentation";
import styles from "./request-workspace.module.css";
const timelineDateFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "short", timeStyle: "short" });
export function RequestRepairSummary({ orders }: { orders: RequestOrder[] }) {
  const sorted = [...orders].sort((a, b) => Number(b.status === "InProgress") - Number(a.status === "InProgress") || Number(b.status === "Open") - Number(a.status === "Open") || b.id - a.id);
  const count = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
  return <>{sorted.slice(0, 3).map(order => <section className={styles.orderSummary} key={order.id} aria-label={`خلاصهٔ پرونده ${order.number}`}>
    <div className={styles.line}><h3><TechnicalValue>{order.number}</TechnicalValue></h3>{orders.length > 1 && <StatusBadge {...orderStatusBadge(order.status)} />}</div>
    {order.workshopName && <p>{order.workshopName}</p>}
    <RepairTimeProgress startedAt={order.startedAt} endedAt={order.endedAt} status={order.status} tasks={order.taskTimes} />
    <RecordProgress title="روند تعمیر" layout="horizontal" items={[
      { id: "prepared", label: "تشکیل پرونده", detail: <span className={styles.excerpt}>{order.diagnosis || "عیب‌یابی ثبت نشده"}</span> },
      { id: "started", label: "شروع تعمیر", detail: order.startedAt ? timelineDateFormatter.format(new Date(order.startedAt)) : order.status === "Cancelled" ? "شروع نشده" : "در انتظار شروع" },
      { id: "finished", label: order.status === "Cancelled" ? "لغو تعمیر" : "پایان تعمیر", detail: order.endedAt ? timelineDateFormatter.format(new Date(order.endedAt)) : order.status === "Completed" ? "زمان پایان ثبت نشده" : order.status === "Cancelled" ? "لغو پیش از شروع" : "هنوز پایان نیافته" },
    ]} />
    <div className={styles.line}><span>کارهای انجام‌شده</span><span>{count(order.completedTaskCount)} از {count(order.taskCount)}</span></div>
    <div className={styles.line}><span>قطعات مصرف‌شده</span><span>{count(order.partCount)} ردیف</span></div>
    {order.finalDescription && <p className={styles.excerpt}>{order.finalDescription}</p>}
    <ActionLink href={`/maintenance/work-orders/${order.id}`}>رسیدگی به پرونده</ActionLink>
  </section>)}{orders.length > 3 && <p>{count(orders.length - 3)} پروندهٔ دیگر در فهرست مرتبط</p>}</>;
}
