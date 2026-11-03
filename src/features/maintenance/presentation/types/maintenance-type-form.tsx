"use client";
import { useState } from "react";
import { FormField, FormSection } from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import type { MaintenanceType } from "../../application/reference-data/maintenance-reference-records";
import { MaintenanceTextField, MaintenanceFormFeedback } from "../shared/form/maintenance-form-fields";
import { MaintenanceFormActions } from "../shared/form/maintenance-form-actions";
import { useMaintenanceFormState } from "../shared/form/use-maintenance-form-state";
import { saveMaintenanceTypeAction } from "./save-maintenance-type.action";
import styles from "../shared/form/maintenance-forms.module.css";
export function MaintenanceTypeForm({ record }: { record?: MaintenanceType }) {
  const [state, action, pending, onInput] = useMaintenanceFormState(saveMaintenanceTypeAction.bind(null, record?.id ?? null));
  const [values, setValues] = useState({ code: record?.code ?? "", name: record?.name ?? "", description: record?.description ?? "", isActive: record?.isActive ?? true });
  return <form id="maintenance-type-form" action={action} onInputCapture={onInput} className={styles.form} noValidate aria-busy={pending}>
    <FormSection title="مشخصات نوع تعمیر و سرویس" description="کد مشخص و عنوان قابل‌فهم برای کاربران وارد کنید."><FormGrid columns={12}>
      <MaintenanceTextField className={styles.half} name="code" label="کد نوع تعمیر و سرویس" value={values.code} onChange={code => setValues(current => ({ ...current, code }))} state={state} disabled={pending} required ltr />
      <MaintenanceTextField className={styles.half} name="name" label="عنوان نوع تعمیر و سرویس" value={values.name} onChange={name => setValues(current => ({ ...current, name }))} state={state} disabled={pending} required />
      <MaintenanceTextField className={styles.full} name="description" label="توضیحات" value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={state} disabled={pending} rows={3} />
      {record && <FormField className={styles.full}><label><input type="checkbox" name="isActive" checked={values.isActive} onChange={event => setValues(current => ({ ...current, isActive: event.target.checked }))} disabled={pending} /> نوع تعمیر و سرویس فعال است</label></FormField>}
    </FormGrid></FormSection>
    <MaintenanceFormFeedback state={state} /><MaintenanceFormActions formId="maintenance-type-form" editing={!!record} name={values.name} cancelHref={record ? `/maintenance/catalogs/${record.id}` : "/maintenance/catalogs"} createLabel="ثبت نوع تعمیر و سرویس" pending={pending} />
  </form>;
}
