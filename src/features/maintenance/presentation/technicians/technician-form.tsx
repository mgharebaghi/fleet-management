"use client";
import { useState } from "react";
import { FieldErrors, FormField, FormSection } from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { SearchableSelect } from "../../../../components/ui/searchable-select/searchable-select";
import { normalizePersianSearchText } from "../../../../shared/text/persian-text";
import type { Technician, Workshop } from "../../application/reference-data/maintenance-reference-records";
import { MaintenanceTextField, MaintenanceFormFeedback, maintenanceFieldErrors } from "../shared/form/maintenance-form-fields";
import { MaintenanceFormActions } from "../shared/form/maintenance-form-actions";
import { useMaintenanceFormState } from "../shared/form/use-maintenance-form-state";
import { saveTechnicianAction } from "./save-technician.action";
import styles from "../shared/form/maintenance-forms.module.css";
export function TechnicianForm({ record, workshops }: { record?: Technician; workshops: Workshop[] }) {
  const [state, action, pending, onInput] = useMaintenanceFormState(saveTechnicianAction.bind(null, record?.id ?? null));
  const [values, setValues] = useState({ firstName: record?.firstName ?? "", lastName: record?.lastName ?? "", mobile: record?.mobile ?? "", specialty: record?.specialty ?? "", description: record?.description ?? "", isActive: record?.isActive ?? true });
  const workshopErrors = maintenanceFieldErrors(state, "workshopId");
  return <form id="technician-form" action={action} onInputCapture={onInput} className={styles.form} noValidate aria-busy={pending}>
    <FormSection title="اطلاعات تعمیرکار" description="تعمیرکار می‌تواند مستقل باشد؛ انتخاب تعمیرگاه الزامی نیست."><FormGrid columns={12}>
      {([{ name: "firstName", label: "نام", required: true }, { name: "lastName", label: "نام خانوادگی", required: true }, { name: "mobile", label: "شمارهٔ همراه", ltr: true }, { name: "specialty", label: "تخصص" }] as const).map(field => <MaintenanceTextField key={field.name} className={styles.half} {...field} value={values[field.name]} onChange={value => setValues(current => ({ ...current, [field.name]: value }))} state={state} disabled={pending} />)}
      <FormField className={styles.full}><SearchableSelect name="workshopId" label="تعمیرگاه" defaultValue={String(record?.workshopId ?? "")} normalizeQuery={normalizePersianSearchText} options={[{ value: "", label: "مستقل از تعمیرگاه", content: "مستقل از تعمیرگاه", searchText: "مستقل" }, ...workshops.map(workshop => ({ value: String(workshop.id), label: `${workshop.name}${workshop.isActive ? "" : " (غیرفعال)"}`, content: `${workshop.name}${workshop.isActive ? "" : " (غیرفعال)"}`, searchText: workshop.name, disabled: !workshop.isActive && workshop.id !== record?.workshopId }))]} disabled={pending} invalid={workshopErrors.length > 0} describedBy="technician-workshop-error" /><FieldErrors id="technician-workshop-error" messages={workshopErrors} /></FormField>
      <MaintenanceTextField className={styles.full} name="description" label="توضیحات" value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={state} disabled={pending} rows={3} />
      {record && <FormField className={styles.full}><label><input type="checkbox" name="isActive" checked={values.isActive} onChange={event => setValues(current => ({ ...current, isActive: event.target.checked }))} disabled={pending} /> تعمیرکار فعال است</label></FormField>}
    </FormGrid></FormSection>
    <MaintenanceFormFeedback state={state} /><MaintenanceFormActions formId="technician-form" editing={!!record} name={`${values.firstName} ${values.lastName}`} cancelHref={record ? `/maintenance/technicians/${record.id}` : "/maintenance/technicians"} createLabel="ثبت تعمیرکار" pending={pending} />
  </form>;
}
