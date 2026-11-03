"use client";
import { useInventoryFormState } from "../../use-inventory-form-state";
import { useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { FieldErrors, FieldHint, FieldLabel, FormActions, FormField, FormSection, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import type { InventoryUnit, PartCategory } from "../../../application/reference-data/inventory-reference-records";
import type { PartRecord } from "../../../application/parts/part-records";
import { savePartAction, type PartFormState } from "./save-part.action";
import styles from "../../shared/inventory-reference-forms.module.css";
import layout from "./part-form.module.css";

export function PartForm({ part, units, categories }: { part?: PartRecord; units: InventoryUnit[]; categories: PartCategory[] }) {
  const [state, submit, pending, stateInput] = useInventoryFormState(savePartAction.bind(null, part?.id ?? null), {} as PartFormState);
  const [values, setValues] = useState({ code: part?.code ?? "", name: part?.name ?? "", partNumber: part?.partNumber ?? "", manufacturer: part?.manufacturer ?? "", minStock: part?.minStock ?? "", maxStock: part?.maxStock ?? "", reorderPoint: part?.reorderPoint ?? "", unitId: String(part?.unitId ?? ""), categoryId: String(part?.categoryId ?? ""), isActive: part?.isActive ?? true });
  const labels = { code: "کد قطعه", name: "نام قطعه", partNumber: "شمارهٔ فنی", manufacturer: "سازنده", minStock: "حداقل موجودی", maxStock: "حداکثر موجودی", reorderPoint: "نقطهٔ سفارش" };
  const errors = (field: keyof typeof values): string[] => {
    if (state.error?.type === "VALIDATION_ERROR" && state.error.fields[field]) return [state.error.fields[field] === "TOO_LONG" ? "متن بیش از حد مجاز است." : "مقدار معتبر وارد کنید."];
    if (field === "code" && state.error?.type === "DUPLICATE_CODE") return ["این کد قطعه قبلاً ثبت شده است."];
    if (field === "unitId" && state.error?.type === "UNIT_NOT_FOUND") return ["واحد انتخاب‌شده وجود ندارد."];
    if (field === "unitId" && state.error?.type === "UNIT_IN_USE") return ["واحد قطعهٔ استفاده‌شده قابل تغییر نیست."];
    if (field === "categoryId" && state.error?.type === "CATEGORY_UNAVAILABLE") return ["دسته‌بندی فعال و معتبر انتخاب کنید."];
    return [];
  };
  return <form id="part-form" action={submit} onInputCapture={stateInput} noValidate aria-busy={pending} className={styles.form}>
    <FormSection title="مشخصات قطعه"><FormGrid>
      {(["code", "name", "partNumber", "manufacturer"] as const).map(field => <FormField key={field}>
        <FieldLabel htmlFor={`part-${field}`} required={field === "code" || field === "name"}>{labels[field]}</FieldLabel>
        <input id={`part-${field}`} name={field} required={field === "code" || field === "name"} className={formControlClassName} value={values[field]} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} dir={field === "code" || field === "partNumber" ? "ltr" : undefined} disabled={pending} aria-invalid={errors(field).length > 0} aria-describedby={`part-${field}-error`} />
        <FieldErrors id={`part-${field}-error`} messages={errors(field)} />
      </FormField>)}
      <FormField><SearchableSelect name="unitId" label="واحد شمارش" required defaultValue={values.unitId} onValueChange={unitId => setValues(current => ({ ...current, unitId }))} normalizeQuery={normalizePersianSearchText} options={units.map(unit => ({ value: String(unit.id), label: unit.name, searchText: unit.name, content: unit.name }))} disabled={pending || part?.isUsed} invalid={errors("unitId").length > 0} describedBy="part-unitId-error" />
        {part?.isUsed && <FieldHint>این قطعه استفاده شده است و واحد آن قابل تغییر نیست.</FieldHint>}<FieldErrors id="part-unitId-error" messages={errors("unitId")} /></FormField>
      <FormField><SearchableSelect name="categoryId" label="دسته‌بندی قطعه" defaultValue={values.categoryId} onValueChange={categoryId => setValues(current => ({ ...current, categoryId }))} normalizeQuery={normalizePersianSearchText} options={[{ value: "", label: "بدون دسته‌بندی", searchText: "بدون دسته‌بندی", content: "بدون دسته‌بندی" }, ...categories.map(category => ({ value: String(category.id), label: category.name + (category.isActive ? "" : " (غیرفعال)"), searchText: category.name, content: category.name + (category.isActive ? "" : " (غیرفعال)"), disabled: !category.isActive && category.id !== part?.categoryId }))]} disabled={pending} invalid={errors("categoryId").length > 0} describedBy="part-categoryId-error" /><FieldErrors id="part-categoryId-error" messages={errors("categoryId")} /></FormField>
    </FormGrid></FormSection>
    <FormSection title="حدود موجودی" description="این مقدارها بر حسب واحد همین قطعه و برای مجموع انبارها هستند؛ موجودی واقعی از گردش انبار به دست می‌آید."><FormGrid columns={12}>
      {(["minStock", "maxStock", "reorderPoint"] as const).map(field => <FormField key={field} className={layout.third}><FieldLabel htmlFor={`part-${field}`}>{labels[field]}</FieldLabel><input id={`part-${field}`} name={field} className={formControlClassName} dir="ltr" inputMode="decimal" value={values[field]} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} disabled={pending} aria-invalid={errors(field).length > 0} aria-describedby={`part-${field}-error`} /><FieldErrors id={`part-${field}-error`} messages={errors(field)} /></FormField>)}
      {part && <FormField className={layout.full}><label><input type="checkbox" name="isActive" checked={values.isActive} onChange={event => setValues(current => ({ ...current, isActive: event.target.checked }))} disabled={pending} /> قطعه فعال است</label></FormField>}
    </FormGrid></FormSection>
    {(state.error || state.formError) && <InlineNotice tone="danger" role="alert">{state.error?.type === "NOT_FOUND" ? "این قطعه دیگر وجود ندارد." : state.formError ? "ذخیره انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید." : "اطلاعات مشخص‌شده را اصلاح کنید."}</InlineNotice>}
    <FormActions separated>{part ? <ConfirmedSubmitButton formId="part-form" titleId="part-confirm-title" dialogTitle="ذخیره تغییرات قطعه" recordName={part.name} message="تغییرات این قطعه ذخیره شود؟" label="ذخیره تغییرات" pendingLabel="در حال ذخیره…" confirmLabel="تأیید و ذخیره" pending={pending} /> : <ActionButton type="submit" pending={pending}>{pending ? "در حال ثبت…" : "ثبت قطعه"}</ActionButton>}<ActionLink href={part ? `/inventory/parts/${part.id}` : "/inventory/parts"}>انصراف</ActionLink></FormActions>
  </form>;
}
