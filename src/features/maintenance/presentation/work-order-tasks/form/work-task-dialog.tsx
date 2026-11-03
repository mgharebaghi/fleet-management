"use client";
import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions, FormField, FieldErrors, FieldHint, FieldLabel, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { DurationInput } from "../../../../../components/ui/duration-input/duration-input";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import { useEditableActionState } from "../../../../../shared/presentation/use-editable-action-state";
import type { WorkOrderRecord } from "../../../application/work-orders/work-order-records";
import type { WorkOrderTask, WorkTaskTechnician } from "../../../application/work-order-tasks/work-order-task-records";
import { MaintenanceTextField } from "../../shared/form/maintenance-form-fields";
import type { MaintenanceFormState } from "../../shared/form/maintenance-form-state";
import styles from "../../shared/form/maintenance-forms.module.css";
import { taskFieldErrors, taskStatusLabels, taskTechnicianLabel, type WorkTaskFormState } from "../shared/work-task-presentation";
import { WorkTaskFeedback } from "../shared/work-task-feedback";
import { cancelWorkTaskAction, fillWorkTaskCostAction, saveWorkTaskAction } from "./work-task-actions";
export function WorkTaskDialog({ order, task, technicians, onClose }: { order: WorkOrderRecord; task?: WorkOrderTask; technicians: WorkTaskTechnician[]; onClose: () => void }) {
  const [state, action, pending, onInput, submitted] = useEditableActionState(saveWorkTaskAction.bind(null, order.id, task?.id ?? null), {} as WorkTaskFormState, { TECHNICIAN_UNAVAILABLE: ["technicianId"], ORDER_NOT_STARTED: ["status"] });
  const [values, setValues] = useState({ title: task?.title ?? "", description: task?.description ?? "", laborHours: task?.laborHours ?? "", technicianId: String(task?.technicianId ?? ""), status: task?.status ?? "Open" });
  useEffect(() => { if (submitted.saved && !pending) onClose(); }, [submitted, pending, onClose]);
  const validation: MaintenanceFormState = state.error?.type === "VALIDATION_ERROR" ? { error: { type: "VALIDATION_ERROR", fields: Object.fromEntries(Object.entries(state.error.fields).filter((entry): entry is [string, "REQUIRED" | "INVALID" | "TOO_LONG"] => entry[1] !== undefined)) } } : {};
  const errors = (name: string) => taskFieldErrors(state, name);
  const started = order.status === "InProgress" && order.startedAt !== null;
  return <Dialog open onClose={() => { if (!pending) onClose(); }} titleId={`task-form-${task?.id ?? "new"}`} title={task ? "ویرایش کار" : "ثبت کار"}>
    <form action={action} onInputCapture={onInput} noValidate aria-busy={pending} className={styles.form}><FormGrid columns={12}>
      <MaintenanceTextField className={styles.full} name="title" label="عنوان کار" required value={values.title} onChange={title => setValues(current => ({ ...current, title }))} state={validation} disabled={pending} />
      <FormField className={styles.full}><SearchableSelect name="technicianId" label="تعمیرکار" defaultValue={values.technicianId} onValueChange={technicianId => setValues(current => ({ ...current, technicianId }))} normalizeQuery={normalizePersianSearchText} disabled={pending} invalid={errors("technicianId").length > 0} describedBy="task-technician-error" options={[{ value: "", label: "هنوز مشخص نشده", content: "هنوز مشخص نشده", searchText: "هنوز مشخص نشده" }, ...technicians.map(technician => ({ value: String(technician.id), label: taskTechnicianLabel(technician), content: taskTechnicianLabel(technician), searchText: taskTechnicianLabel(technician), disabled: !technician.isActive && technician.id !== task?.technicianId }))]} /><FieldErrors id="task-technician-error" messages={errors("technicianId")} /></FormField>
      <FormField className={styles.half}><DurationInput id="task-labor-hours" name="laborHours" label="مدت کار" placeholder="انتخاب مدت کار" confirmLabel="انتخاب مدت کار" value={values.laborHours} onValueChange={laborHours => setValues(current => ({ ...current, laborHours }))} disabled={pending} invalid={errors("laborHours").length > 0} describedBy="task-hours-error" /><FieldErrors id="task-hours-error" messages={errors("laborHours")} /></FormField>
      <FormField className={styles.half}><MoneyInput id="task-labor-cost" name="laborCost" label="اجرت کار" defaultValue={task?.laborCost ?? ""} disabled={pending} invalid={errors("laborCost").length > 0} describedBy="task-cost-error" /><FieldErrors id="task-cost-error" messages={errors("laborCost")} /></FormField>
      <FormField className={styles.full}><FieldLabel htmlFor="task-status">وضعیت کار</FieldLabel><select id="task-status" name="status" className={formControlClassName} value={values.status} onChange={event => setValues(current => ({ ...current, status: event.target.value }))} disabled={pending} aria-invalid={errors("status").length > 0} aria-describedby="task-status-error">{Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value} disabled={!started && (value === "InProgress" || value === "Completed")}>{label}</option>)}</select><FieldErrors id="task-status-error" messages={errors("status")} />{!started && <FieldHint>تا شروع واقعی تعمیر، کار در حالت ثبت‌شده یا لغوشده نگهداری می‌شود.</FieldHint>}</FormField>
      <MaintenanceTextField className={styles.full} name="description" label="توضیحات کار" value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={validation} disabled={pending} rows={3} />
    </FormGrid><FieldHint>خالی‌بودن اجرت یعنی مبلغ هنوز مشخص نیست؛ اگر کار بدون اجرت است، صفر را وارد کنید. لغو کار، ساعت و اجرت ثبت‌شده را پاک نمی‌کند.</FieldHint>
      <WorkTaskFeedback state={state} /><FormActions separated><ActionButton type="submit" pending={pending}>{pending ? "در حال ثبت…" : task ? "ذخیره تغییرات" : "ثبت کار"}</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions>
    </form>
  </Dialog>;
}
export function CancelWorkTaskDialog({ orderId, task, onClose }: { orderId: number; task: WorkOrderTask; onClose: () => void }) {
  const [state, action, pending] = useActionState(cancelWorkTaskAction.bind(null, orderId, task.id), {} as WorkTaskFormState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`cancel-work-task-${task.id}`} title="لغو کار" recordName={task.title} message="این کار لغو شود؟ ساعت کار، اجرت و توضیحات قبلی در سوابق حفظ می‌شوند."><form action={action} aria-busy={pending}><WorkTaskFeedback state={state} /><FormActions separated><ActionButton type="submit" variant="danger" pending={pending}>تأیید لغو</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions></form></ConfirmDialog>;
}
export function FillWorkTaskCostDialog({ orderId, task, onClose }: { orderId: number; task: WorkOrderTask; onClose: () => void }) {
  const [state, action, pending, onInput, submitted] = useEditableActionState(fillWorkTaskCostAction.bind(null, orderId, task.id), {} as WorkTaskFormState, {});
  useEffect(() => { if (submitted.saved && !pending) onClose(); }, [submitted, pending, onClose]);
  return <Dialog open onClose={() => { if (!pending) onClose(); }} titleId={`fill-task-cost-${task.id}`} title="تکمیل اجرت کار" description={task.title}><form action={action} onInputCapture={onInput} aria-busy={pending} noValidate className={styles.form}><FormField><MoneyInput id="missing-task-cost" name="laborCost" label="اجرت کار" invalid={taskFieldErrors(state, "laborCost").length > 0} describedBy="missing-task-cost-error" disabled={pending} /><FieldErrors id="missing-task-cost-error" messages={taskFieldErrors(state, "laborCost")} /></FormField><FieldHint>پرونده بسته است؛ فقط اجرت نامشخص ثبت می‌شود. مبلغ پس از ثبت در این نسخه قابل تغییر نیست.</FieldHint><WorkTaskFeedback state={state} /><FormActions separated><ActionButton type="submit" pending={pending}>ثبت اجرت</ActionButton><ActionButton variant="secondary" onClick={onClose} disabled={pending}>انصراف</ActionButton></FormActions></form></Dialog>;
}

export function CreateWorkTaskButton({ order, technicians, compact = false, label = "ثبت کار" }: { order: WorkOrderRecord; technicians: WorkTaskTechnician[]; compact?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  return <><ActionButton size={compact ? "sm" : "md"} onClick={() => setOpen(true)}>{label}</ActionButton>
    {open && <WorkTaskDialog order={order} technicians={technicians} onClose={() => setOpen(false)} />}</>;
}
