"use client";
import { useInventoryFormState } from "../../use-inventory-form-state";

import { useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { FieldErrors, FieldLabel, FormActions, FormField, FormSection, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import type { Warehouse } from "../../../application/reference-data/inventory-reference-records";
import { saveWarehouseAction } from "./save-warehouse.action";
import { initialInventoryReferenceFormState } from "../../shared/inventory-reference-form-state";
import { inventoryReferenceFieldErrors, inventoryReferenceStatusMessage } from "../../shared/inventory-reference-messages";
import styles from "../../shared/inventory-reference-forms.module.css";
import { AddressMapDialog } from "../../../../../maps/presentation/address/address-map-dialog";
import layout from "./warehouse-form.module.css";

export function WarehouseForm({ warehouse }: { warehouse?: Warehouse }) {
  const [state, submit, pending, stateInput] = useInventoryFormState(saveWarehouseAction.bind(null, warehouse?.id ?? null), initialInventoryReferenceFormState);
  const [values, setValues] = useState({ code: warehouse?.code ?? "", name: warehouse?.name ?? "", location: warehouse?.location ?? "", isActive: warehouse?.isActive ?? true });
  const message = inventoryReferenceStatusMessage(state);
  const [addressMapOpen, setAddressMapOpen] = useState(false);
  const formId = "inventory-warehouse-form";
  return <form id={formId} action={submit} onInputCapture={stateInput} noValidate aria-busy={pending} className={styles.form}>
    <FormSection title="اطلاعات انبار" description="کد مشخص، نام و محل انبار را وارد کنید.">
      <FormGrid columns={12}>
        {(["code", "name"] as const).map(field => <FormField key={field} className={layout.half}>
          <FieldLabel htmlFor={`warehouse-${field}`} required>{field === "code" ? "کد انبار" : "نام انبار"}</FieldLabel>
          <input id={`warehouse-${field}`} name={field} className={formControlClassName} dir="rtl" value={values[field]} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} required disabled={pending} aria-invalid={inventoryReferenceFieldErrors(state, field).length > 0} aria-describedby={`warehouse-${field}-error`} />
          <FieldErrors id={`warehouse-${field}-error`} messages={inventoryReferenceFieldErrors(state, field)} />
        </FormField>)}
        <FormField className={layout.full}>
          <FieldLabel htmlFor="warehouse-location">نشانی یا محل انبار</FieldLabel>
          <textarea id="warehouse-location" name="location" className={formControlClassName} value={values.location} onChange={event => setValues(current => ({ ...current, location: event.target.value }))} disabled={pending} rows={3} aria-invalid={inventoryReferenceFieldErrors(state, "location").length > 0} aria-describedby="warehouse-location-error" />
          <FieldErrors id="warehouse-location-error" messages={inventoryReferenceFieldErrors(state, "location")} />
          <FormActions><ActionButton variant="secondary" size="sm" disabled={pending} onClick={() => setAddressMapOpen(true)}>انتخاب نشانی از نقشه</ActionButton></FormActions>
        </FormField>
        {warehouse && <FormField className={layout.full}>
          <label><input type="checkbox" name="isActive" checked={values.isActive} onChange={event => setValues(current => ({ ...current, isActive: event.target.checked }))} disabled={pending} /> انبار فعال است</label>
        </FormField>}
      </FormGrid>
    </FormSection>
    {addressMapOpen && <AddressMapDialog onClose={() => setAddressMapOpen(false)} onConfirm={location => { setValues(current => ({ ...current, location })); setAddressMapOpen(false); }} />}
    {message && <InlineNotice tone="danger" role="alert">{message}</InlineNotice>}
    <FormActions separated>
      {warehouse ? <ConfirmedSubmitButton formId={formId} titleId="warehouse-save-confirm-title" dialogTitle="ذخیره تغییرات انبار" recordName={warehouse.name} identityLines={[{ label: "کد انبار", value: warehouse.code }]} message="تغییرات این انبار ذخیره شود؟" label="ذخیره تغییرات" pendingLabel="در حال ذخیره…" confirmLabel="تأیید و ذخیره" pending={pending} />
        : <ActionButton type="submit" pending={pending}>{pending ? "در حال ثبت…" : "ثبت انبار"}</ActionButton>}
      <ActionLink href={warehouse ? `/inventory/warehouses/${warehouse.id}` : "/inventory/warehouses"}>انصراف</ActionLink>
    </FormActions>
  </form>;
}
