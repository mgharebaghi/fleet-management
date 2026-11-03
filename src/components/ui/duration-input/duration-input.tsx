"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { ActionButton } from "../action-button/action-button";
import { Dialog } from "../dialog/dialog";
import { DecimalInput } from "../decimal-input/decimal-input";
import { FieldHint, FieldLabel, FormActions, FormField, formControlClassName } from "../form-field/form-field";
import { FormGrid } from "../form-grid/form-grid";
import { TechnicalValue } from "../technical-value/technical-value";
import { useFormValueNotification } from "../../../shared/presentation/use-form-value-notification";
import { decimalHoursFromParts, durationParts, formatDuration } from "./duration-value";
import styles from "./duration-input.module.css";

type DurationInputProps = { id: string; name: string; label: string; value: string; onValueChange: (value: string) => void; disabled?: boolean; invalid?: boolean; describedBy?: string; placeholder?: string; confirmLabel?: string };
/** Accumulated hours, not a 24-hour clock. Existing hundredths stay exact until edited. */
export function DurationInput({ id, name, label, value, onValueChange, disabled = false, invalid = false, describedBy, placeholder = "انتخاب مدت کارکرد", confirmLabel = "انتخاب کارکرد" }: DurationInputProps) {
  const [open, setOpen] = useState(false), inputRef = useRef<HTMLInputElement>(null);
  useFormValueNotification(inputRef, value);
  return <><FieldLabel htmlFor={id}>{label}</FieldLabel><input ref={inputRef} type="hidden" name={name} value={value} readOnly /><button id={id} type="button" className={`${formControlClassName} ${styles.trigger}`} disabled={disabled} data-invalid={invalid || undefined} aria-describedby={describedBy} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><span>{value ? <TechnicalValue>{formatDuration(value)}</TechnicalValue> : placeholder}</span><span aria-hidden="true">▾</span></button>
    {open && <DurationDialog id={id} label={label} value={value} confirmLabel={confirmLabel} onClose={() => setOpen(false)} onSelect={selected => { onValueChange(selected); setOpen(false); }} />}
  </>;
}
function DurationDialog({ id, label, value, confirmLabel, onClose, onSelect }: { id: string; label: string; value: string; confirmLabel: string; onClose: () => void; onSelect: (value: string) => void }) {
  const initial = durationParts(value);
  const [hours, setHours] = useState(initial?.hours ?? ""), [minutes, setMinutes] = useState(initial?.minutes ?? "00"), [changed, setChanged] = useState(false);
  const conversion = decimalHoursFromParts(hours, minutes);
  const preview = !changed && initial ? { value, rounded: false } : conversion;
  function applyWithKeyboard(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.key === "Enter") { event.preventDefault(); if (preview) onSelect(preview.value); }
  }
  return <Dialog open onClose={onClose} titleId={`${id}-dialog-title`} title={`انتخاب ${label}`}>
    <div className={styles.form}><FormGrid><FormField><FieldLabel htmlFor={`${id}-hours`}>ساعت</FieldLabel><DecimalInput id={`${id}-hours`} name={`${id}-hours-draft`} value={hours} onValueChange={next => { setHours(next); setChanged(true); }} invalid={hours !== "" && !conversion} onKeyDown={applyWithKeyboard} /></FormField><FormField><FieldLabel htmlFor={`${id}-minutes`}>دقیقه</FieldLabel><select id={`${id}-minutes`} className={formControlClassName} value={minutes} onKeyDown={applyWithKeyboard} onChange={event => { setMinutes(event.target.value); setChanged(true); }}>{Array.from({ length: 60 }, (_, minute) => <option key={minute} value={String(minute).padStart(2, "0")}>{String(minute).padStart(2, "0")}</option>)}</select></FormField></FormGrid>
      <FieldHint>مدت زمان می‌تواند بیشتر از ۲۴ ساعت باشد. قالب نمایش ساعت:دقیقه است و در صورت نیاز ثانیه هم نمایش داده می‌شود.</FieldHint>
      {preview && <FieldHint>مقدار ذخیره‌شده: <TechnicalValue>{preview.value}</TechnicalValue> ساعت؛ معادل <TechnicalValue>{formatDuration(preview.value)}</TechnicalValue>.{preview.rounded ? " دقیقهٔ انتخابی برای ذخیره‌سازی به نزدیک‌ترین صدم ساعت گرد می‌شود." : ""}</FieldHint>}
      {!changed && initial && initial.seconds !== "00" && <FieldHint>مقدار قبلی شامل ثانیه است و تا زمانی که انتخاب را تغییر ندهید، دقیقاً حفظ می‌شود.</FieldHint>}
      <FormActions separated><ActionButton disabled={!preview} onClick={() => { if (preview) onSelect(preview.value); }}>{confirmLabel}</ActionButton><ActionButton variant="secondary" onClick={onClose}>انصراف</ActionButton>{value && <ActionButton variant="secondary" onClick={() => onSelect("")}>پاک کردن</ActionButton>}</FormActions>
    </div>
  </Dialog>;
}
