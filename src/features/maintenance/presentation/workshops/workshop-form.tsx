"use client";
import { useState } from "react";
import { FormActions, FormField, FormSection } from "../../../../components/ui/form-field/form-field";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { AddressMapDialog } from "../../../../maps/presentation/address/address-map-dialog";
import type { Workshop } from "../../application/reference-data/maintenance-reference-records";
import { MaintenanceTextField, MaintenanceFormFeedback } from "../shared/form/maintenance-form-fields";
import { MaintenanceFormActions } from "../shared/form/maintenance-form-actions";
import { useMaintenanceFormState } from "../shared/form/use-maintenance-form-state";
import { saveWorkshopAction } from "./save-workshop.action";
import styles from "../shared/form/maintenance-forms.module.css";
export function WorkshopForm({ record }: { record?: Workshop }) {
  const [state, action, pending, onInput] = useMaintenanceFormState(saveWorkshopAction.bind(null, record?.id ?? null));
  const [mapOpen, setMapOpen] = useState(false);
  const [values, setValues] = useState({ name: record?.name ?? "", workshopType: record?.workshopType ?? "", address: record?.address ?? "", phone: record?.phone ?? "", contactPerson: record?.contactPerson ?? "", description: record?.description ?? "", isInternal: record?.isInternal ?? false, isActive: record?.isActive ?? true });
  return <form id="workshop-form" action={action} onInputCapture={onInput} className={styles.form} noValidate aria-busy={pending}>
    <FormSection title="اطلاعات تعمیرگاه" description="نوع فعالیت را متناسب با تعمیرگاه بنویسید؛ مانند عمومی، مکانیکی یا برق خودرو."><FormGrid columns={12}>
      {([{ name: "name", label: "نام تعمیرگاه", required: true }, { name: "workshopType", label: "نوع فعالیت تعمیرگاه", required: true }, { name: "phone", label: "تلفن", ltr: true }, { name: "contactPerson", label: "نام مسئول تماس" }] as const).map(field => <MaintenanceTextField key={field.name} className={styles.half} {...field} value={values[field.name]} onChange={value => setValues(current => ({ ...current, [field.name]: value }))} state={state} disabled={pending} />)}
      <FormField className={styles.full}><label><input type="checkbox" name="isInternal" checked={values.isInternal} onChange={event => setValues(current => ({ ...current, isInternal: event.target.checked }))} disabled={pending} /> تعمیرگاه داخلی سازمان است</label></FormField>
      <MaintenanceTextField className={styles.full} name="address" label="نشانی تعمیرگاه" value={values.address} onChange={address => setValues(current => ({ ...current, address }))} state={state} disabled={pending} rows={3} />
      <FormField className={styles.full}><FormActions><ActionButton variant="secondary" size="sm" disabled={pending} onClick={() => setMapOpen(true)}>انتخاب نشانی از نقشه</ActionButton></FormActions></FormField>
      <MaintenanceTextField className={styles.full} name="description" label="توضیحات" value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={state} disabled={pending} rows={3} />
      {record && <FormField className={styles.full}><label><input type="checkbox" name="isActive" checked={values.isActive} onChange={event => setValues(current => ({ ...current, isActive: event.target.checked }))} disabled={pending} /> تعمیرگاه فعال است</label></FormField>}
    </FormGrid></FormSection>
    {mapOpen && <AddressMapDialog onClose={() => setMapOpen(false)} onConfirm={address => { setValues(current => ({ ...current, address })); setMapOpen(false); }} />}
    <MaintenanceFormFeedback state={state} /><MaintenanceFormActions formId="workshop-form" editing={!!record} name={values.name} cancelHref={record ? `/maintenance/workshops/${record.id}` : "/maintenance/workshops"} createLabel="ثبت تعمیرگاه" pending={pending} />
  </form>;
}
