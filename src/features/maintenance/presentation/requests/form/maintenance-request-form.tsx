"use client";
import { useState } from "react";
import { FieldErrors, FieldHint, FieldLabel, FormField, FormSection, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { DurationInput } from "../../../../../components/ui/duration-input/duration-input";
import { DecimalInput } from "../../../../../components/ui/decimal-input/decimal-input";
import { MaintenanceVehicleOption } from "../../shared/vehicle/maintenance-vehicle-option";

import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import { useEditableActionState } from "../../../../../shared/presentation/use-editable-action-state";
import type { MaintenanceRequestRecord, RequestReferences } from "../../../application/requests/maintenance-request-records";
import { MaintenanceTextField } from "../../shared/form/maintenance-form-fields";
import { MaintenanceFormActions } from "../../shared/form/maintenance-form-actions";
import styles from "../../shared/form/maintenance-forms.module.css";
import { requestFieldErrors, type RequestFormState } from "../shared/request-form-state";
import { RequestFormFeedback } from "../shared/request-form-feedback";
import { saveMaintenanceRequestAction } from "./save-maintenance-request.action";

export function MaintenanceRequestForm({ record, references }: { record?: MaintenanceRequestRecord; references: RequestReferences }) {
  const [state, action, pending, onInput] = useEditableActionState(saveMaintenanceRequestAction.bind(null, record?.id ?? null), {} as RequestFormState, { VEHICLE_UNAVAILABLE: ["vehicleId"], TYPE_UNAVAILABLE: ["maintenanceTypeId"] });
  const [values, setValues] = useState({ vehicleId: String(record?.vehicle.id ?? ""), maintenanceTypeId: String(record?.type.id ?? ""), problem: record?.problem ?? "", reportedOdometer: record?.reportedOdometer ?? "", reportedEngineHours: record?.reportedEngineHours ?? "", priority: record?.priority ?? "", description: record?.description ?? "" });
  const [customPriorities, setCustomPriorities] = useState<string[]>(record?.priority ? [record.priority] : []);
  const priorities = [...new Set(["کم", "عادی", "زیاد", "فوری", ...customPriorities])];
  const fieldState = state.error?.type === "VALIDATION_ERROR" ? { error: state.error } : {};
  const vehicleErrors = requestFieldErrors(state, "vehicleId"), typeErrors = requestFieldErrors(state, "maintenanceTypeId");
  return <form id="maintenance-request-form" action={action} onInputCapture={onInput} noValidate aria-busy={pending} className={styles.form}>
    <FormSection title="خودرو و نوع تعمیر" description="این درخواست، گزارش نیاز به تعمیر یا سرویس است؛ ثبت آن به معنی شروع تعمیر خودرو نیست."><FormGrid columns={12}>
      <FormField className={styles.half}><SearchableSelect name="vehicleId" label="خودرو" required defaultValue={values.vehicleId} onValueChange={vehicleId => setValues(current => ({ ...current, vehicleId }))} normalizeQuery={normalizePersianSearchText} options={references.vehicles.map(vehicle => ({ value: String(vehicle.id), label: `${vehicle.code} — ${vehicle.brandName} ${vehicle.modelName}${vehicle.isActive ? "" : " (غیرفعال)"}`, triggerContent: <span>{vehicle.code} — {vehicle.brandName} {vehicle.modelName}{vehicle.isActive ? "" : " (غیرفعال)"}</span>, content: <MaintenanceVehicleOption vehicle={vehicle} />, searchText: `${vehicle.code} ${vehicle.brandName} ${vehicle.modelName} ${vehicle.plateNoLeftSide} ${vehicle.plateNoCenterChar ?? ""} ${vehicle.plateNoRightSide ?? ""} ${vehicle.plateNoIranNo ?? ""}`, disabled: !vehicle.isActive && vehicle.id !== record?.vehicle.id }))} disabled={pending || !!record?.orders.length} invalid={vehicleErrors.length > 0} describedBy="request-vehicle-error" /><FieldErrors id="request-vehicle-error" messages={vehicleErrors} /></FormField>
      <FormField className={styles.half}><SearchableSelect name="maintenanceTypeId" label="نوع تعمیر و سرویس" required defaultValue={values.maintenanceTypeId} onValueChange={maintenanceTypeId => setValues(current => ({ ...current, maintenanceTypeId }))} normalizeQuery={normalizePersianSearchText} options={references.types.map(type => ({ value: String(type.id), label: `${type.name} — ${type.code}${type.isActive ? "" : " (غیرفعال)"}`, content: `${type.name}${type.isActive ? "" : " (غیرفعال)"} — ${type.code}`, searchText: `${type.name} ${type.code}`, disabled: !type.isActive && type.id !== record?.type.id }))} disabled={pending || !!record?.orders.length} invalid={typeErrors.length > 0} describedBy="request-type-error" /><FieldErrors id="request-type-error" messages={typeErrors} /></FormField>
      {!!record?.orders.length && <FormField className={styles.full}><FieldHint>به دلیل وجود پروندهٔ مرتبط، خودرو و نوع تعمیر قابل تغییر نیست.</FieldHint></FormField>}
      <MaintenanceTextField className={styles.full} name="problem" label="شرح مشکل یا نیاز به سرویس" value={values.problem} onChange={problem => setValues(current => ({ ...current, problem }))} state={fieldState} disabled={pending} rows={4} />
    </FormGrid></FormSection>
    <FormSection title="اطلاعات گزارش‌شده"><FormGrid columns={12}>
      <FormField className={styles.half}><FieldLabel htmlFor="request-reportedOdometer">کیلومتر گزارش‌شده</FieldLabel><DecimalInput id="request-reportedOdometer" name="reportedOdometer" value={values.reportedOdometer} onValueChange={reportedOdometer => setValues(current => ({ ...current, reportedOdometer }))} disabled={pending} invalid={requestFieldErrors(state, "reportedOdometer").length > 0} describedBy="request-reportedOdometer-error" /><FieldHint>واحد: کیلومتر</FieldHint><FieldErrors id="request-reportedOdometer-error" messages={requestFieldErrors(state, "reportedOdometer")} /></FormField>
      <FormField className={styles.half}><DurationInput id="request-reportedEngineHours" name="reportedEngineHours" label="ساعت کارکرد گزارش‌شده" value={values.reportedEngineHours} onValueChange={reportedEngineHours => setValues(current => ({ ...current, reportedEngineHours }))} disabled={pending} invalid={requestFieldErrors(state, "reportedEngineHours").length > 0} describedBy="request-reportedEngineHours-error" /><FieldHint>قالب مدت: ساعت:دقیقه؛ با امکان نمایش ثانیه</FieldHint><FieldErrors id="request-reportedEngineHours-error" messages={requestFieldErrors(state, "reportedEngineHours")} /></FormField>
      <FormField className={styles.half}><SearchableSelect name="priority" label="اولویت" defaultValue={values.priority} onValueChange={priority => setValues(current => ({ ...current, priority }))} onCreateOption={priority => setCustomPriorities(current => [...current, priority])} createOptionLabel="استفاده از اولویت جدید" customValueMaxLength={50} normalizeQuery={normalizePersianSearchText} options={[{ value: "", label: "تعیین نشده", content: "تعیین نشده", searchText: "تعیین نشده" }, ...priorities.map(priority => ({ value: priority, label: priority, content: priority, searchText: priority }))]} disabled={pending} invalid={requestFieldErrors(state, "priority").length > 0} describedBy="request-priority-error" /><FieldErrors id="request-priority-error" messages={requestFieldErrors(state, "priority")} /></FormField>
      <FormField className={styles.half}><FieldLabel htmlFor="request-time">زمان درخواست</FieldLabel><input id="request-time" className={formControlClassName} value={record ? "زمان ثبت اولیه حفظ می‌شود" : "هنگام ثبت به‌صورت خودکار تعیین می‌شود"} disabled readOnly /></FormField>
      <MaintenanceTextField className={styles.full} name="description" label="یادداشت تکمیلی" value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={fieldState} disabled={pending} rows={3} />
    </FormGrid></FormSection>
    <InlineNotice tone="info">کارکرد گزارش‌شده فقط در همین درخواست ذخیره می‌شود و کارکرد فعلی یا تاریخچهٔ خودرو را تغییر نمی‌دهد.</InlineNotice>
    <RequestFormFeedback state={state} /><MaintenanceFormActions formId="maintenance-request-form" editing={!!record} name={`درخواست ${record?.id ?? "جدید"}`} cancelHref={record ? `/maintenance/requests/${record.id}` : "/maintenance/requests"} createLabel="ثبت درخواست تعمیر" pending={pending} />
  </form>;
}
