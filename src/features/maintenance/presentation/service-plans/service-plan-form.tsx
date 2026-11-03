"use client";
import { validPlanWarning } from "../../application/service-plans/service-plan-due";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { useState } from "react";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { ConfirmedSubmitButton } from "../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { FormSection, FormField, FormActions, FieldLabel, FieldErrors, FieldHint, formControlClassName } from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { DecimalInput } from "../../../../components/ui/decimal-input/decimal-input";
import { DurationInput } from "../../../../components/ui/duration-input/duration-input";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import { SearchableSelect } from "../../../../components/ui/searchable-select/searchable-select";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { useEditableActionState } from "../../../../shared/presentation/use-editable-action-state";
import { normalizePersianSearchText } from "../../../../shared/text/persian-text";
import type { ServicePlan, ServicePlanReferences } from "../../application/service-plans/service-plan-records";
import { MaintenanceVehicleOption, maintenanceVehicleLabel } from "../shared/vehicle/maintenance-vehicle-option";
import { MaintenanceTextField } from "../shared/form/maintenance-form-fields";
import { planErrors, planFailureMessages, planValue, type PlanFormState } from "./service-plan-presentation";
import { saveServicePlanAction } from "./save-service-plan.action";
import styles from "./service-plan.module.css";
export function ServicePlanForm({ record, references, today }: { record?: ServicePlan; references: ServicePlanReferences; today: string }) {
  const [values, setValues] = useState({ title: record?.title ?? "", description: record?.description ?? "", intervalKm: record?.intervalKm ?? "", intervalDays: record?.intervalDays ?? "", intervalHours: record?.intervalHours ?? "", warningKm: record?.warningKm ?? "", warningDays: record?.warningDays ?? "", warningHours: record?.warningHours ?? "", lastOdometer: record?.lastOdometer ?? "", lastHours: record?.lastHours ?? "" });
  const [source, setSource] = useState({ vehicleId: String(record?.vehicleId ?? ""), typeId: String(record?.maintenanceTypeId ?? "") });
  const [active, setActive] = useState(record?.isActive ?? true);
  const [criteria, setCriteria] = useState({ km: record?.intervalKm != null, days: record?.intervalDays != null, hours: record?.intervalHours != null });
  const [rawState, action, pending, onInput] = useEditableActionState(saveServicePlanAction.bind(null, record?.id ?? null), {} as PlanFormState, { INTERVAL_REQUIRED: ["useKm", "useDays", "useHours", "intervalKm", "intervalDays", "intervalHours"], VEHICLE_UNAVAILABLE: ["vehicleId"], TYPE_UNAVAILABLE: ["maintenanceTypeId"], SOURCE_FIXED: ["vehicleId", "maintenanceTypeId"], BASELINE_LOCKED: ["lastDate", "lastOdometer", "lastHours"] });
  let state = rawState;
  if (rawState.error?.type === "VALIDATION_ERROR") {
    const fields = { ...rawState.error.fields };
    for (const [key, interval, warning, baseline] of [["km", "intervalKm", "warningKm", "lastOdometer"], ["days", "intervalDays", "warningDays", "lastDate"], ["hours", "intervalHours", "warningHours", "lastHours"]] as const) if (!criteria[key]) {
      delete fields[interval]; delete fields[warning]; delete fields[baseline];
    }
    for (const [interval, warning] of [["intervalKm", "warningKm"], ["intervalDays", "warningDays"], ["intervalHours", "warningHours"]] as const) if (fields[warning] && validPlanWarning(values[interval], values[warning], interval === "intervalDays")) delete fields[warning];
    state = Object.keys(fields).length ? { ...rawState, error: { type: "VALIDATION_ERROR", fields } } : { ...rawState, error: undefined };
  }
  const locked = !!record?.orderCount, errors = (field: string) => planErrors(state, field);
  const validation = state.error?.type === "VALIDATION_ERROR" ? { error: state.error } : {};
  const numberField = (name: keyof typeof values, label: string, hours = false, readOnly = false) => <FormField className={styles.third}>{(!hours || readOnly) && <FieldLabel htmlFor={`plan-${name}`}>{label}</FieldLabel>}{readOnly ? <><input type="hidden" name={name} value={values[name]} /><input id={`plan-${name}`} readOnly className={formControlClassName} value={planValue(values[name] || null, hours ? "hours" : "km")} /></> : hours ? <DurationInput id={`plan-${name}`} name={name} label={label} value={values[name]} onValueChange={value => setValues(current => ({ ...current, [name]: value }))} disabled={pending} invalid={errors(name).length > 0} describedBy={`plan-${name}-error`} /> : <DecimalInput id={`plan-${name}`} name={name} value={values[name]} onValueChange={value => setValues(current => ({ ...current, [name]: value }))} disabled={pending} invalid={errors(name).length > 0} describedBy={`plan-${name}-error`} />}<FieldErrors id={`plan-${name}-error`} messages={errors(name)} /></FormField>;
  return <form id="service-plan-form" action={action} onInputCapture={onInput} noValidate aria-busy={pending} className={styles.form}>
    <FormSection title="اطلاعات برنامه">
      <FormGrid columns={12}><MaintenanceTextField className={styles.full} name="title" label="عنوان برنامهٔ سرویس" required value={values.title} onChange={title => setValues(current => ({ ...current, title }))} state={validation} disabled={pending} />
      <FormField className={styles.half}><SearchableSelect name="vehicleId" label="خودرو" defaultValue={source.vehicleId} onValueChange={vehicleId => setSource(current => ({ ...current, vehicleId }))} required disabled={pending || locked} invalid={errors("vehicleId").length > 0} describedBy="plan-vehicle-error" normalizeQuery={normalizePersianSearchText} options={references.vehicles.map(vehicle => ({ value: String(vehicle.id), label: maintenanceVehicleLabel(vehicle), content: <MaintenanceVehicleOption vehicle={vehicle} />, searchText: maintenanceVehicleLabel(vehicle), disabled: !vehicle.isActive && vehicle.id !== record?.vehicleId }))} /><FieldErrors id="plan-vehicle-error" messages={errors("vehicleId")} /></FormField>
      <FormField className={styles.half}><SearchableSelect name="maintenanceTypeId" label="نوع تعمیر و سرویس" defaultValue={source.typeId} onValueChange={typeId => setSource(current => ({ ...current, typeId }))} required disabled={pending || locked} invalid={errors("maintenanceTypeId").length > 0} describedBy="plan-type-error" normalizeQuery={normalizePersianSearchText} options={references.types.map(type => ({ value: String(type.id), label: `${type.name}${type.isActive ? "" : " (غیرفعال)"}`, content: `${type.name}${type.isActive ? "" : " (غیرفعال)"}`, searchText: `${type.name} ${type.code}`, disabled: !type.isActive && type.id !== record?.maintenanceTypeId }))} /><FieldErrors id="plan-type-error" messages={errors("maintenanceTypeId")} /></FormField>
      <MaintenanceTextField className={styles.full} name="description" label="یادداشت تکمیلی" value={values.description} onChange={description => setValues(current => ({ ...current, description }))} state={validation} rows={2} disabled={pending} /></FormGrid>
      {record ? <label><input type="checkbox" name="isActive" checked={active} onChange={event => setActive(event.target.checked)} disabled={pending} /> برنامه فعال باشد</label> : <input type="hidden" name="isActive" value="on" />}
    </FormSection>
    <FormSection title="سرویس بر چه مبنایی انجام شود؟" description="یک یا چند معیار انتخاب کنید؛ رسیدن هرکدام برای موعد سرویس کافی است.">
      <div className={styles.criteriaOptions}>{([["km", "useKm", "کیلومتر"], ["days", "useDays", "زمان"], ["hours", "useHours", "ساعت کارکرد"]] as const).map(([key, name, label]) => <label key={key}><input type="checkbox" name={name} checked={criteria[key]} onChange={event => setCriteria(current => ({ ...current, [key]: event.target.checked }))} disabled={pending} aria-controls={`plan-criterion-${key}`} /> {label}</label>)}</div>
      {!criteria.km && !criteria.days && !criteria.hours && <FieldHint>حداقل یک معیار را انتخاب کنید.</FieldHint>}
      <fieldset id="plan-criterion-km" className={styles.criterionFields} hidden={!criteria.km} disabled={pending || !criteria.km}><legend>کیلومتر</legend><FormGrid columns={12}>{numberField("intervalKm", "فاصلهٔ سرویس (کیلومتر)")}{numberField("warningKm", "هشدار قبل از موعد (کیلومتر)")}{numberField("lastOdometer", "کیلومتر آخرین سرویس", false, locked)}</FormGrid></fieldset>
      <fieldset id="plan-criterion-days" className={styles.criterionFields} hidden={!criteria.days} disabled={pending || !criteria.days}><legend>زمان</legend><FormGrid columns={12}>{numberField("intervalDays", "فاصلهٔ سرویس (روز)")}{numberField("warningDays", "هشدار قبل از موعد (روز)")}<FormField className={styles.third}>{locked ? <><FieldLabel htmlFor="plan-last-date">تاریخ آخرین سرویس</FieldLabel><input type="hidden" name="lastDate" value={record?.lastDate ?? ""} /><input id="plan-last-date" readOnly className={formControlClassName} value={planValue(record?.lastDate ?? null, "days", true)} /></> : <JalaliDatePicker name="lastDate" label="تاریخ آخرین سرویس" defaultValue={record?.lastDate ?? ""} maxDate={today} disabled={pending || !criteria.days} invalid={errors("lastDate").length > 0} describedBy="plan-lastDate-error" />}<FieldErrors id="plan-lastDate-error" messages={errors("lastDate")} /></FormField></FormGrid></fieldset>
      <fieldset id="plan-criterion-hours" className={styles.criterionFields} hidden={!criteria.hours} disabled={pending || !criteria.hours}><legend>ساعت کارکرد</legend><FormGrid columns={12}>{numberField("intervalHours", "فاصلهٔ سرویس (ساعت)", true)}{numberField("warningHours", "هشدار قبل از موعد (ساعت)", true)}{numberField("lastHours", "ساعت کارکرد آخرین سرویس", true, locked)}</FormGrid></fieldset>
      {([["km", "intervalKm", "warningKm", "lastOdometer"], ["days", "intervalDays", "warningDays", "lastDate"], ["hours", "intervalHours", "warningHours", "lastHours"]] as const).map(([key, interval, warning, baseline]) => !criteria[key] && <span key={key} hidden><input type="hidden" name={interval} value="" /><input type="hidden" name={warning} value="" /><input type="hidden" name={baseline} value={baseline === "lastDate" ? record?.lastDate ?? "" : values[baseline]} /></span>)}
      {(criteria.km || criteria.days || criteria.hours) && <FieldHint>فاصلهٔ سرویس الزامی و هشدار اختیاری است. مبنا را از آخرین سرویس خودرو وارد کنید.</FieldHint>}
      {locked && <FieldHint>مبنای آخرین سرویس از پایان پروندهٔ سرویس به‌روز می‌شود.</FieldHint>}
    </FormSection>
    {state.error && <InlineNotice tone="danger" role="alert">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : planFailureMessages[state.error.type]}</InlineNotice>}{state.unavailable && <InlineNotice tone="danger" role="alert">ثبت اطلاعات تأیید نشد؛ پیش از تلاش دوباره، فهرست را بررسی کنید.</InlineNotice>}
    <FormActions separated>{record ? <ConfirmedSubmitButton formId="service-plan-form" titleId="plan-edit-confirm" dialogTitle="ذخیره تغییرات" recordName={record.title} label="ذخیره تغییرات" confirmLabel="تأیید و ذخیره" message="تغییرات برنامهٔ سرویس ذخیره شود؟" pendingLabel="در حال ذخیره…" pending={pending} /> : <ActionButton type="submit" pending={pending}>ثبت برنامهٔ سرویس</ActionButton>}<ActionLink href={record ? `/maintenance/plans/${record.id}` : "/maintenance/plans"}>انصراف</ActionLink></FormActions>
  </form>;
}
