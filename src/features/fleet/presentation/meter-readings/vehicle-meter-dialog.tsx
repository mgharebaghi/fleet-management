"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import { FormActions, FormField, FieldErrors, FieldHint, FieldLabel, formControlClassName } from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { DecimalInput } from "../../../../components/ui/decimal-input/decimal-input";
import { DurationInput } from "../../../../components/ui/duration-input/duration-input";
import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import { TimeSelect } from "../../../../components/ui/time-select/time-select";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { useEditableActionState } from "../../../../shared/presentation/use-editable-action-state";
import { recordVehicleMeterAction } from "./record-vehicle-meter.action";
import { meterFailureMessages, meterFieldErrors, type VehicleMeterFormState } from "./vehicle-meter-form-state";
import styles from "./vehicle-meter.module.css";
export function CreateVehicleMeterButton({ vehicleId, initialDay, initialTime }: { vehicleId: number; initialDay: string; initialTime: string }) {
  const [open, setOpen] = useState(false);
  return <><ActionButton onClick={() => setOpen(true)}>ثبت کارکرد</ActionButton>{open && <VehicleMeterDialog vehicleId={vehicleId} initialDay={initialDay} initialTime={initialTime} onClose={() => setOpen(false)} />}</>;
}
function VehicleMeterDialog({ vehicleId, initialDay, initialTime, onClose }: { vehicleId: number; initialDay: string; initialTime: string; onClose: () => void }) {
  const [odometer, setOdometer] = useState(""), [hours, setHours] = useState("");
  const [state, action, pending, onInput, submitted] = useEditableActionState(recordVehicleMeterAction.bind(null, vehicleId), {} as VehicleMeterFormState, { METRIC_REQUIRED: ["odometer", "engineHours"], INVALID_RECORDED_AT: ["readingDay", "readingTime"], FUTURE_READING: ["readingDay", "readingTime"] });
  useEffect(() => { if (submitted.saved && !pending) onClose(); }, [submitted, pending, onClose]);
  const dateError = state.error?.type === "INVALID_RECORDED_AT" || state.error?.type === "FUTURE_READING" ? meterFailureMessages[state.error.type] : null;
  return <Dialog open onClose={() => { if (!pending) onClose(); }} titleId="vehicle-meter-title" title="ثبت کارکرد خودرو">
    <form action={action} onInputCapture={onInput} noValidate aria-busy={pending} className={styles.form}>
      <FieldHint>حداقل کیلومتر یا ساعت کارکرد را وارد کنید. زمان ثبت به وقت تهران است.</FieldHint>
      <FormGrid>
        <FormField><JalaliDatePicker name="readingDay" label="تاریخ کارکرد" defaultValue={initialDay} maxDate={initialDay} disabled={pending} invalid={Boolean(dateError)} describedBy="meter-date-error" /></FormField>
        <FormField><TimeSelect id="meter-time" name="readingTime" label="ساعت ثبت کارکرد" defaultValue={initialTime} disabled={pending} /></FormField>
        <FormField><FieldLabel htmlFor="meter-odometer">کیلومتر خودرو</FieldLabel><DecimalInput id="meter-odometer" name="odometer" value={odometer} onValueChange={setOdometer} disabled={pending} invalid={meterFieldErrors(state, "odometer").length > 0} describedBy="meter-odometer-error" /><FieldErrors id="meter-odometer-error" messages={meterFieldErrors(state, "odometer")} /></FormField>
        <FormField><DurationInput id="meter-engine-hours" name="engineHours" label="ساعت کارکرد موتور" value={hours} onValueChange={setHours} disabled={pending} invalid={meterFieldErrors(state, "engineHours").length > 0} describedBy="meter-hours-error" /><FieldErrors id="meter-hours-error" messages={meterFieldErrors(state, "engineHours")} /></FormField>
      </FormGrid>
      <FieldErrors id="meter-date-error" messages={dateError ? [dateError] : []} />
      <FormField><FieldLabel htmlFor="meter-description">یادداشت</FieldLabel><textarea id="meter-description" name="description" className={formControlClassName} rows={3} disabled={pending} aria-invalid={meterFieldErrors(state, "description").length > 0} aria-describedby="meter-description-error" /><FieldErrors id="meter-description-error" messages={meterFieldErrors(state, "description")} /></FormField>
      {state.error && state.error.type !== "VALIDATION_ERROR" && !dateError && <InlineNotice tone="danger" role="alert">{meterFailureMessages[state.error.type]}</InlineNotice>}
      {state.unavailable && <InlineNotice tone="danger" role="alert">ثبت کارکرد تأیید نشد؛ پیش از تلاش دوباره، سوابق را بررسی کنید.</InlineNotice>}
      <FormActions separated><ActionButton type="submit" pending={pending}>ثبت کارکرد</ActionButton><ActionButton variant="secondary" onClick={onClose} disabled={pending}>انصراف</ActionButton></FormActions>
    </form>
  </Dialog>;
}
