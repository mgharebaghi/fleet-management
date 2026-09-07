"use client";

import { useActionState, useId } from "react";
import { ActionButton } from "../../../components/ui/action-button/action-button";
import { FormField, FieldLabel, FormActions, formControlClassName } from "../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../components/ui/inline-notice/inline-notice";
import { JalaliDatePicker } from "../../../components/ui/date-picker/jalali-date-picker";
import { SearchableSelect } from "../../../components/ui/searchable-select/searchable-select";
import { TechnicalValue } from "../../../components/ui/technical-value/technical-value";
import { TimeSelect } from "../../../components/ui/time-select/time-select";
import { normalizeVehicleSearchText } from "../../fleet/application/vehicles/vehicle-text";
import { buildVehicleOptions } from "../../fleet/presentation/vehicle-insurances/create-vehicle-insurance/vehicle-options";
import type { PersonReference, VehicleReference } from "../application/driver-records";
import { addLicenseAction, assignVehicleAction, closeAssignmentAction, defineDriverAction } from "./driver.actions";
import { driverMessages } from "./driver-form-data";
import styles from "./driver-form.module.css";

type Props = { kind: "driver"; people: PersonReference[] } | { kind: "license"; driverId: number } | { kind: "assignment"; driverId: number; vehicles: VehicleReference[] } | { kind: "close"; driverId: number; assignmentId: number };
const labels: Record<string, string> = { licenseType: "نوع گواهینامه", licenseNo: "شمارهٔ گواهینامه", issueDate: "تاریخ صدور (شمسی)", expireDate: "تاریخ انقضا (شمسی)", fromDay: "تاریخ شروع (شمسی)", fromTime: "ساعت شروع (تهران)", toDay: "تاریخ پایان (شمسی)", toTime: "ساعت پایان (تهران)", startOdometer: "کیلومتر شروع", endOdometer: "کیلومتر پایان", description: "توضیحات" };
const titles = { driver: "تعریف راننده", license: "ثبت گواهینامه", assignment: "ثبت تخصیص", close: "ثبت پایان تخصیص" };

export function DriverForm(props: Props) {
  const action = props.kind === "driver" ? defineDriverAction : props.kind === "license" ? addLicenseAction.bind(null, props.driverId) : props.kind === "assignment" ? assignVehicleAction.bind(null, props.driverId) : closeAssignmentAction.bind(null, props.driverId, props.assignmentId);
  const [state, formAction, pending] = useActionState(action, {});
  const prefix = useId();
  const value = (name: string) => state.values?.[name] ?? "";
  const textFields = props.kind === "license" ? ["licenseType", "licenseNo"] : props.kind === "assignment" ? ["startOdometer", "endOdometer", "description"] : props.kind === "close" ? ["endOdometer"] : [];
  const dateFields = props.kind === "license" ? ["issueDate", "expireDate"] : props.kind === "assignment" ? ["fromDay", "toDay"] : props.kind === "close" ? ["toDay"] : [];
  const dayFields = dateFields.filter(name => name.endsWith("Day"));
  // Vehicles use the same option shape as Create VehicleInsurance, so the
  // brand/model line, formatted plate and disambiguating code stay identical
  // wherever a vehicle is picked.
  const options = props.kind === "driver" ? props.people.map(p => ({ value: String(p.personId), label: `${p.firstName} ${p.lastName} ${p.personnelNo ?? ""} ${p.nationalCode ?? ""}`, searchText: `${p.firstName} ${p.lastName} ${p.personnelNo ?? ""} ${p.nationalCode ?? ""}`, content: <span>{p.firstName} {p.lastName} — <TechnicalValue>{p.personnelNo ?? p.nationalCode ?? String(p.personId)}</TechnicalValue></span> })) : props.kind === "assignment" ? buildVehicleOptions(props.vehicles) : [];

  return <form action={formAction} noValidate aria-busy={pending} aria-label={titles[props.kind]} aria-describedby={state.error ? `${prefix}-error` : undefined} className={styles.form}>
    {state.error && <div id={`${prefix}-error`}><InlineNotice tone="danger" role="alert">{driverMessages[state.error]}</InlineNotice></div>}
    <FormGrid>
      {(props.kind === "driver" || props.kind === "assignment") && <FormField>
        <SearchableSelect name={props.kind === "driver" ? "personId" : "vehicleId"} label={props.kind === "driver" ? "شخص" : "خودرو"} options={options} defaultValue={value(props.kind === "driver" ? "personId" : "vehicleId")} disabled={pending} required
          placeholder={props.kind === "driver" ? "انتخاب شخص" : "انتخاب خودرو"}
          searchPlaceholder={props.kind === "driver" ? "جستجوی نام، شمارهٔ پرسنلی یا کد ملی…" : "جستجوی برند، مدل، پلاک یا کد خودرو…"}
          normalizeQuery={props.kind === "assignment" ? normalizeVehicleSearchText : undefined} />
      </FormField>}
      {textFields.map(name => <FormField key={name}><FieldLabel htmlFor={`${prefix}-${name}`} required={name === "licenseType" || name === "licenseNo"}>{labels[name]}</FieldLabel>
        <input id={`${prefix}-${name}`} name={name} className={formControlClassName} type="text" dir={name === "description" || name === "licenseType" ? "rtl" : "ltr"} inputMode={name.includes("Odometer") ? "decimal" : undefined} defaultValue={value(name)} disabled={pending} />
      </FormField>)}
      {/* Dates without a clock are ordinary fields and share the grid. */}
      {dayFields.length === 0 && dateFields.map(name => <FormField key={name}>
        <JalaliDatePicker name={name} label={labels[name]} defaultValue={value(name)} disabled={pending} />
      </FormField>)}
    </FormGrid>
    {/* A day and its Tehran clock take a full-width row of their own so the two
        halves read as one control instead of being squeezed into a grid cell. */}
    {dayFields.length > 0 && <div className={styles.dateSection}>
      {dayFields.map(name => <div key={name} className={styles.dateGroup}>
        <JalaliDatePicker name={name} label={labels[name]} defaultValue={value(name)} disabled={pending} />
        <TimeSelect id={`${prefix}-${name}-time`} name={name.replace("Day", "Time")} label={labels[name.replace("Day", "Time")]} defaultValue={value(name.replace("Day", "Time"))} disabled={pending} />
      </div>)}
    </div>}
    {/* The record's status closes the license form: the identifying fields are
        answered first, the state it should be saved in last. */}
    {props.kind === "license" && <FormGrid>
      <FormField><FieldLabel htmlFor={`${prefix}-active`}>وضعیت گواهینامه</FieldLabel><select id={`${prefix}-active`} name="isActive" className={formControlClassName} defaultValue={state.values?.isActive ?? "true"} disabled={pending}><option value="true">فعال</option><option value="false">غیرفعال</option></select></FormField>
    </FormGrid>}
    {(props.kind === "assignment" || props.kind === "close") && <p className={styles.note}>تاریخ و ساعت به وقت تهران است. تاریخ و ساعت پایان را با هم وارد کنید. پایان دقیق یک بازه می‌تواند شروع بازهٔ بعدی باشد.</p>}
    {/* The single-field driver form has nothing to separate the action from. */}
    <FormActions separated={props.kind !== "driver"}><ActionButton type="submit" disabled={pending || ((props.kind === "driver" || props.kind === "assignment") && options.length === 0)} pending={pending}>{titles[props.kind]}</ActionButton></FormActions>
  </form>;
}
