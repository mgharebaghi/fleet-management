"use client";
import { RecordDetailsButton } from "../../../../../components/ui/record-details-button/record-details-button";

import { useState } from "react";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { FormSection } from "../../../../../components/ui/form-field/form-field";
import { IconActionButton, IconActionGroup } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { CancelIcon, EditIcon } from "../../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { RecordCard, RecordCardDetails, RecordCardDetail, RecordCardHeader, RecordCardList } from "../../../../../components/ui/record-cards/record-cards";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { formatDuration } from "../../../../../components/ui/duration-input/duration-value";
import { workOrderIsEditable, workOrderStatuses } from "../../../application/work-orders/work-order-records";
import { workTaskStatuses, type WorkOrderTask, type WorkTaskSnapshot } from "../../../application/work-order-tasks/work-order-task-records";
import { workTaskCosts } from "../../../application/work-order-tasks/work-task-costs";
import { MaintenanceRecordSummary } from "../../shared/record/maintenance-record-summary";
import styles from "../../shared/record/maintenance-record.module.css";
import { taskStatusBadge, taskTechnicianLabel } from "../shared/work-task-presentation";
import { CreateWorkTaskButton, WorkTaskDialog, CancelWorkTaskDialog, FillWorkTaskCostDialog } from "../form/work-task-dialog";
type SelectedTask = { mode: "edit" | "cancel" | "cost"; task: WorkOrderTask };
export function WorkOrderTasksPanel({ snapshot }: { snapshot: WorkTaskSnapshot }) {
  const { order, tasks, technicians } = snapshot;
  const knownOrder = order.origin !== "Unknown" && workOrderStatuses.includes(order.status as typeof workOrderStatuses[number]);
  const editable = knownOrder && workOrderIsEditable(order.status), costs = workTaskCosts(tasks);
  const [selected, setSelected] = useState<SelectedTask | null>(null);
  function actions(task: WorkOrderTask) {
    const knownTask = workTaskStatuses.includes(task.status as typeof workTaskStatuses[number]);
    const fillCost = knownOrder && !editable && knownTask && task.laborCost === null;
    return <IconActionGroup><RecordDetailsButton title={task.title} fields={[["عنوان کار", task.title], ["تعمیرکار", task.technician ? taskTechnicianLabel(task.technician) : "تعیین نشده"], ["مدت کار", task.laborHours === null ? "ثبت نشده" : formatDuration(task.laborHours)]]} description={task.description} /><IconActionButton label={editable && knownTask ? `ویرایش کار ${task.title}` : fillCost ? `تکمیل اجرت کار ${task.title}` : `ویرایش کار ${task.title} امکان‌پذیر نیست`} icon={<EditIcon />} disabled={!((editable && knownTask) || fillCost)} onClick={() => setSelected({ mode: fillCost ? "cost" : "edit", task })} />{editable && knownTask && task.status !== "Cancelled" && <IconActionButton label={`لغو کار ${task.title}`} icon={<CancelIcon />} tone="danger" onClick={() => setSelected({ mode: "cancel", task })} />}</IconActionGroup>;
  }
  const amount = (task: WorkOrderTask) => task.laborCost === null ? "هنوز مشخص نیست" : <><TechnicalValue>{formatDecimalAmount(task.laborCost)}</TechnicalValue> تومان</>;
  return <div className={styles.sections}><FormSection title="کارها و اجرت" action={editable ? <CreateWorkTaskButton order={order} technicians={technicians} compact /> : undefined}>
    {tasks.length > 0 && (costs ? <MaintenanceRecordSummary fields={[["مجموع اجرت‌های ثبت‌شده", <span key="total"><TechnicalValue>{formatDecimalAmount(costs.knownTotal)}</TechnicalValue> تومان</span>], ["وضعیت اجرت‌ها", <StatusBadge key="cost-state" label={costs.missingCount > 0 ? `اجرت ${new Intl.NumberFormat("fa-IR").format(costs.missingCount)} کار مشخص نیست` : "اجرت همهٔ کارها ثبت شده"} tone={costs.missingCount > 0 ? "warning" : "positive"} />]]} /> : <InlineNotice role="alert" tone="danger">محاسبهٔ اجرت امکان‌پذیر نیست؛ مبلغ نامعتبر در سوابق وجود دارد و نادیده گرفته نشده است.</InlineNotice>)}
    {!knownOrder && <InlineNotice role="alert" tone="danger">وضعیت یا منشأ پرونده نامشخص است؛ تغییر کارها ممکن نیست.</InlineNotice>}
    {tasks.length > 0 ? <><DataTable caption="کارها و اجرت پروندهٔ تعمیر" stickyActions><thead><tr>{["کار و تعمیرکار", "مدت و وضعیت کار", "اجرت", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{tasks.map(task => <tr key={task.id}><td>{task.title}<div><small>{task.technician ? taskTechnicianLabel(task.technician) : "تعمیرکار تعیین نشده"}</small></div></td><td>{task.laborHours === null ? "ثبت نشده" : <TechnicalValue>{formatDuration(task.laborHours)}</TechnicalValue>}<div><StatusBadge {...taskStatusBadge(task.status)} /></div></td><td>{amount(task)}</td><td>{actions(task)}</td></tr>)}</tbody></DataTable><RecordCardList>{tasks.map(task => <RecordCard key={task.id}><RecordCardHeader title={task.title} badge={<StatusBadge {...taskStatusBadge(task.status)} />} /><RecordCardDetails><RecordCardDetail label="تعمیرکار">{task.technician ? taskTechnicianLabel(task.technician) : "هنوز مشخص نشده"}</RecordCardDetail><RecordCardDetail label="مدت کار">{task.laborHours === null ? "ثبت نشده" : <TechnicalValue>{formatDuration(task.laborHours)}</TechnicalValue>}</RecordCardDetail><RecordCardDetail label="اجرت">{amount(task)}</RecordCardDetail></RecordCardDetails>{actions(task)}</RecordCard>)}</RecordCardList></> : <ResultState title="هنوز کاری در این پرونده ثبت نشده است" description={editable ? "با ثبت کار، عنوان و تعمیرکار و اطلاعات اجرت را مشخص کنید." : "پرونده بسته است و کار جدیدی به آن اضافه نمی‌شود."} />}
  </FormSection>{selected?.mode === "edit" && <WorkTaskDialog order={order} task={selected.task} technicians={technicians} onClose={() => setSelected(null)} />}{selected?.mode === "cancel" && <CancelWorkTaskDialog orderId={order.id} task={selected.task} onClose={() => setSelected(null)} />}{selected?.mode === "cost" && <FillWorkTaskCostDialog orderId={order.id} task={selected.task} onClose={() => setSelected(null)} />}</div>;
}
