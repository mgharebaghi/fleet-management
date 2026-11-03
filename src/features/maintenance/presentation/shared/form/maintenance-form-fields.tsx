"use client";
import { FieldErrors, FieldLabel, FormField, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { referenceFailureMessages, type MaintenanceFormState } from "./maintenance-form-state";

export function maintenanceFieldErrors(state: MaintenanceFormState, name: string): string[] {
  if (state.error?.type === "DUPLICATE_CODE" && name === "code") return [referenceFailureMessages.DUPLICATE_CODE];
  if (state.error?.type === "WORKSHOP_UNAVAILABLE" && name === "workshopId") return [referenceFailureMessages.WORKSHOP_UNAVAILABLE];
  if (state.error?.type !== "VALIDATION_ERROR" || !state.error.fields[name]) return [];
  const code = state.error.fields[name];
  return [code === "REQUIRED" ? "این فیلد را تکمیل کنید." : code === "TOO_LONG" ? "متن واردشده بیش از حد مجاز است." : "مقدار واردشده معتبر نیست."];
}
export function MaintenanceTextField({ name, label, value, onChange, state, required = false, disabled, rows, ltr = false, className }: { name: string; label: string; value: string; onChange: (value: string) => void; state: MaintenanceFormState; required?: boolean; disabled: boolean; rows?: number; ltr?: boolean; className?: string }) {
  const id = `maintenance-${name}`, errors = maintenanceFieldErrors(state, name);
  const props = { id, name, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), required, disabled, dir: ltr ? "ltr" : "rtl", className: formControlClassName, "aria-invalid": errors.length > 0, "aria-describedby": `${id}-error` };
  return <FormField className={className}><FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>{rows ? <textarea {...props} rows={rows} /> : <input {...props} />}<FieldErrors id={`${id}-error`} messages={errors} /></FormField>;
}
export function MaintenanceFormFeedback({ state }: { state: MaintenanceFormState }) {
  return <>{state.error && <InlineNotice tone="danger" role="alert">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : referenceFailureMessages[state.error.type]}</InlineNotice>}{state.unavailable && <InlineNotice tone="danger" role="alert">ثبت اطلاعات امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.</InlineNotice>}</>;
}
