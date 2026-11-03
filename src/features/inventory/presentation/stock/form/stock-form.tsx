"use client";
import { useState } from "react";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { FieldErrors, FieldLabel, FieldHint, FormField, FormActions, FormSection, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import { useInventoryFormState } from "../../use-inventory-form-state";
import type { StockReferences, StockMovementInput } from "../../../application/stock/stock-records";
import { stockMovementTypes } from "../../../application/stock/stock-records";
import { stockTypeLabels, stockFailureMessages } from "../shared/stock-messages";
import { appendStockAction, type StockFormState } from "./append-stock.action";
import styles from "./stock-form.module.css";

export function StockForm({ references, warehouseId = "", partId = "" }: { references: StockReferences; warehouseId?: string; partId?: string }) {
  const [state, action, pending, onInput] = useInventoryFormState(appendStockAction, {} as StockFormState);
  const [values, setValues] = useState({ warehouseId, partId, type: "Receipt", quantity: "", description: "" });
  const errors = (name: string) => state.error?.type === "VALIDATION_ERROR" ? state.error.fields[name as keyof StockMovementInput] : undefined;
  const messages = (name: string) => errors(name) ? [errors(name) === "REQUIRED" ? "این فیلد را تکمیل کنید." : errors(name) === "TOO_LONG" ? "توضیح حداکثر ۵۰۰ نویسه است." : "مقدار معتبر با حداکثر دو رقم اعشار وارد کنید."] : [];
  const part = references.parts.find(entry => String(entry.id) === values.partId);
  return <form id="stock-append-form" action={action} onInputCapture={onInput} aria-busy={pending} noValidate className={styles.form}>
    <InlineNotice tone="info">گردش ثبت‌شده ویرایش یا حذف نمی‌شود. مصرف قطعه در پروندهٔ تعمیر، مستقل از خروج انبار است.</InlineNotice>
    <FormSection title="اطلاعات گردش انبار" description="مقدار را مثبت وارد کنید؛ نوع گردش مشخص می‌کند موجودی افزایش یا کاهش یابد.">
      <FormGrid columns={12}>
        <FormField className={styles.half}><SearchableSelect name="warehouseId" label="انبار" required defaultValue={values.warehouseId} onValueChange={warehouseId => setValues(current => ({ ...current, warehouseId }))} normalizeQuery={normalizePersianSearchText}
          options={references.warehouses.map(entry => ({ value: String(entry.id), label: `${entry.name} — ${entry.code}`, content: `${entry.name} — ${entry.code}${entry.active ? "" : " (غیرفعال)"}`, searchText: `${entry.name} ${entry.code}`, disabled: !entry.active }))} disabled={pending} invalid={!!errors("warehouseId")} describedBy="stock-warehouse-error" /><FieldErrors id="stock-warehouse-error" messages={messages("warehouseId")} /></FormField>
        <FormField className={styles.half}><SearchableSelect name="partId" label="قطعه" required defaultValue={values.partId} onValueChange={partId => setValues(current => ({ ...current, partId }))} normalizeQuery={normalizePersianSearchText}
          options={references.parts.map(entry => ({ value: String(entry.id), label: `${entry.name} — ${entry.code}`, content: `${entry.name} — ${entry.code}${entry.active ? "" : " (غیرفعال)"}`, searchText: `${entry.name} ${entry.code}`, disabled: !entry.active }))} disabled={pending} invalid={!!errors("partId")} describedBy="stock-part-error" /><FieldErrors id="stock-part-error" messages={messages("partId")} /></FormField>
        <FormField className={styles.half}><FieldLabel htmlFor="stock-type" required>نوع گردش</FieldLabel><select id="stock-type" name="type" className={formControlClassName} value={values.type} disabled={pending} onChange={event => setValues(current => ({ ...current, type: event.target.value }))} aria-invalid={!!errors("type")} aria-describedby="stock-type-error">{stockMovementTypes.map(type => <option key={type} value={type}>{stockTypeLabels[type]}</option>)}</select><FieldErrors id="stock-type-error" messages={messages("type")} /></FormField>
        <FormField className={styles.half}><FieldLabel htmlFor="stock-quantity" required>مقدار</FieldLabel><input id="stock-quantity" name="quantity" className={formControlClassName} dir="ltr" inputMode="decimal" value={values.quantity} onChange={event => setValues(current => ({ ...current, quantity: event.target.value }))} required disabled={pending} aria-invalid={!!errors("quantity")} aria-describedby="stock-quantity-error" /><FieldHint>واحد: {part?.unitName ?? "ابتدا قطعه را انتخاب کنید"}</FieldHint><FieldErrors id="stock-quantity-error" messages={messages("quantity")} /></FormField>
        <FormField className={styles.half}><MoneyInput id="stock-price" name="unitPrice" label="قیمت هر واحد" defaultValue={state.values?.unitPrice ?? ""} disabled={pending} invalid={!!errors("unitPrice")} describedBy="stock-price-error" /><FieldErrors id="stock-price-error" messages={messages("unitPrice")} /></FormField>
        <FormField className={styles.half}><FieldLabel htmlFor="stock-time">زمان گردش</FieldLabel><input id="stock-time" value="هنگام ثبت، به‌صورت خودکار تعیین می‌شود" disabled className={formControlClassName} readOnly /></FormField>
        <FormField className={styles.full}><FieldLabel htmlFor="stock-description">توضیحات</FieldLabel><textarea id="stock-description" name="description" value={values.description} onChange={event => setValues(current => ({ ...current, description: event.target.value }))} rows={3} disabled={pending} className={formControlClassName} aria-invalid={!!errors("description")} aria-describedby="stock-description-error" /><FieldHint>برای اصلاح موجودی، توضیح الزامی است.</FieldHint><FieldErrors id="stock-description-error" messages={messages("description")} /></FormField>
      </FormGrid>
    </FormSection>
    {state.error && <InlineNotice role="alert" tone="danger">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : stockFailureMessages[state.error.type]}</InlineNotice>}
    {state.unavailable && <InlineNotice role="alert" tone="danger">نتیجهٔ ثبت مشخص نیست. پیش از ثبت مجدد، گردش انبار را بررسی کنید؛ ارسال خودکار تکرار نمی‌شود.</InlineNotice>}
    <FormActions separated><ConfirmedSubmitButton formId="stock-append-form" titleId="stock-append-confirm" dialogTitle="ثبت قطعی گردش انبار" recordName={part?.name ?? "گردش انبار"} message="این گردش به سوابق اضافه شود؟ برای اصلاح آن باید گردش جدید ثبت کنید." label="ثبت گردش" pendingLabel="در حال ثبت…" confirmLabel="تأیید و ثبت" pending={pending} /><ActionLink href="/inventory/movements">انصراف</ActionLink></FormActions>
  </form>;
}
