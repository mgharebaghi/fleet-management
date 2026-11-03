"use client";
import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions, FormField, FieldLabel, FieldErrors, FieldHint } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { DecimalInput } from "../../../../../components/ui/decimal-input/decimal-input";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import { useEditableActionState } from "../../../../../shared/presentation/use-editable-action-state";
import type { WorkOrderPart, WorkPartSnapshot } from "../../../application/work-order-parts/work-order-part-records";
import { workTaskStatuses } from "../../../application/work-order-tasks/work-order-task-records";
import { MaintenanceTextField } from "../../shared/form/maintenance-form-fields";
import type { MaintenanceFormState } from "../../shared/form/maintenance-form-state";
import styles from "../../shared/form/maintenance-forms.module.css";
import { taskStatusLabels } from "../../work-order-tasks/shared/work-task-presentation";
import { workPartFieldErrors, type WorkPartFormState } from "../shared/work-part-presentation";
import { WorkPartFeedback } from "../shared/work-part-feedback";
import { saveWorkPartAction, fillWorkPartPriceAction, deleteWorkPartAction } from "./work-part-actions";

export function WorkPartDialog({ snapshot, item, priceOnly = false, onClose }: { snapshot: WorkPartSnapshot; item?: WorkOrderPart; priceOnly?: boolean; onClose: () => void }) {
  const handler = priceOnly && item ? fillWorkPartPriceAction.bind(null, snapshot.order.id, item.id) : saveWorkPartAction.bind(null, snapshot.order.id, item?.id ?? null);
  const [state, action, pending, onInput, submitted] = useEditableActionState(handler, {} as WorkPartFormState, { PART_UNAVAILABLE: ["partId"], TASK_NOT_FOUND: ["taskId"] });
  const [values, setValues] = useState({ partId: String(item?.partId ?? ""), taskId: String(item?.taskId ?? ""), quantity: item?.quantity ?? "", description: item?.description ?? "" });
  useEffect(() => { if (submitted.saved && !pending) onClose(); }, [submitted, pending, onClose]);
  const errors = (name: string) => workPartFieldErrors(state, name);
  const validation: MaintenanceFormState = state.error?.type === "VALIDATION_ERROR" ? { error: { type: "VALIDATION_ERROR", fields: Object.fromEntries(Object.entries(state.error.fields).filter((entry): entry is [string, "REQUIRED" | "INVALID" | "TOO_LONG"] => entry[1] !== undefined)) } } : {};
  const selectedPart = snapshot.catalog.find(part => String(part.id) === values.partId);
  const catalogOptions = snapshot.catalog.map(part => ({ value: String(part.id), label: `${part.name} — کد ${part.code}${part.isActive ? "" : " (غیرفعال)"}`, content: `${part.name} — کد ${part.code}${part.isActive ? "" : " (غیرفعال)"}`, searchText: `${part.name} ${part.code} ${part.unitName}`, disabled: !part.isActive && part.id !== item?.partId }));
  if (item && !snapshot.catalog.some(part => part.id === item.partId)) catalogOptions.push({ value: String(item.partId), label: `قطعه با شناسهٔ ${item.partId} در کاتالوگ پیدا نشد`, content: `قطعه با شناسهٔ ${item.partId} در کاتالوگ پیدا نشد`, searchText: String(item.partId), disabled: true });
  const price = <FormField className={priceOnly ? styles.full : styles.half}><MoneyInput id="consumed-unit-price" name="unitPrice" label="قیمت هر واحد" defaultValue={item?.unitPrice ?? ""} invalid={errors("unitPrice").length > 0} describedBy="consumed-price-error" disabled={pending} /><FieldErrors id="consumed-price-error" messages={errors("unitPrice")} /></FormField>;
  return <Dialog open onClose={() => { if (!pending) onClose(); }} titleId="consumed-part-form" title={priceOnly ? "تکمیل قیمت قطعه" : item ? "ویرایش قطعهٔ مصرف‌شده" : "ثبت قطعهٔ مصرف‌شده"}>
    <form action={action} onInputCapture={onInput} noValidate aria-busy={pending} className={styles.form}><FormGrid columns={12}>
      {priceOnly ? price : <>
        <FormField className={styles.full}><SearchableSelect name="partId" label="قطعه" required defaultValue={values.partId} onValueChange={partId => setValues(current => ({ ...current, partId }))} normalizeQuery={normalizePersianSearchText} invalid={errors("partId").length > 0} describedBy="consumed-part-error" disabled={pending} options={catalogOptions} /><FieldErrors id="consumed-part-error" messages={errors("partId")} /></FormField>
        <FormField className={styles.full}><SearchableSelect name="taskId" label="کار مرتبط" defaultValue={values.taskId} onValueChange={taskId => setValues(current => ({ ...current, taskId }))} normalizeQuery={normalizePersianSearchText} invalid={errors("taskId").length > 0} describedBy="consumed-task-error" disabled={pending} options={[{ value: "", label: "کل پرونده؛ بدون کار مشخص", content: "کل پرونده؛ بدون کار مشخص", searchText: "کل پرونده بدون کار مشخص" }, ...snapshot.tasks.map(task => ({ value: String(task.id), label: `${task.title} — ${taskStatusLabels[task.status] ?? "وضعیت نامشخص"}`, content: `${task.title} — ${taskStatusLabels[task.status] ?? "وضعیت نامشخص"}`, searchText: task.title, disabled: !workTaskStatuses.some(status => status === task.status) }))]} /><FieldErrors id="consumed-task-error" messages={errors("taskId")} /></FormField>
        <FormField className={styles.half}><FieldLabel htmlFor="consumed-quantity" required>مقدار مصرف</FieldLabel><DecimalInput id="consumed-quantity" name="quantity" value={values.quantity} onValueChange={quantity => setValues(current => ({ ...current, quantity }))} disabled={pending} invalid={errors("quantity").length > 0} describedBy="consumed-quantity-error" />{selectedPart && <FieldHint>واحد: {selectedPart.unitName}</FieldHint>}<FieldErrors id="consumed-quantity-error" messages={errors("quantity")} /></FormField>
        {price}
        <MaintenanceTextField className={styles.full} name="description" label="توضیحات" rows={3} value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={validation} disabled={pending} />
      </>}
    </FormGrid><FieldHint>{priceOnly ? "فقط قیمت نامشخص تکمیل می‌شود؛ مقدار مصرف و سایر اطلاعات ثابت می‌مانند." : "قیمت خالی یعنی هنوز مشخص نیست؛ برای قطعهٔ بدون هزینه، صفر وارد کنید."}</FieldHint>
      <WorkPartFeedback state={state} /><FormActions separated><ActionButton type="submit" pending={pending}>{priceOnly ? "ثبت قیمت" : item ? "ذخیره تغییرات" : "ثبت مصرف"}</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions>
    </form>
  </Dialog>;
}
export function CreateWorkPartButton({ snapshot, compact = false }: { snapshot: WorkPartSnapshot; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><ActionButton size={compact ? "sm" : "md"} onClick={() => setOpen(true)}>ثبت قطعهٔ مصرف‌شده</ActionButton>{open && <WorkPartDialog snapshot={snapshot} onClose={() => setOpen(false)} />}</>;
}
export function DeleteWorkPartDialog({ orderId, item, onClose }: { orderId: number; item: WorkOrderPart; onClose: () => void }) {
  const [state, action, pending] = useActionState(deleteWorkPartAction.bind(null, orderId, item.id), {} as WorkPartFormState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId="delete-consumed-part" title="حذف قطعهٔ مصرف‌شده" recordName={item.part?.name ?? `شناسهٔ قطعه ${item.partId}`} message="این ردیف مصرف از پرونده حذف شود؟ موجودی انبار تغییر نمی‌کند."><form action={action} aria-busy={pending}><WorkPartFeedback state={state} /><FormActions separated><ActionButton type="submit" variant="danger" pending={pending}>تأیید حذف</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions></form></ConfirmDialog>;
}
