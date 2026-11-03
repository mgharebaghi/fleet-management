"use client";
import { useLayoutEffect, useRef, type KeyboardEventHandler } from "react";
import { formControlClassName } from "../form-field/form-field";
import { normalizePersianNumerals } from "../../../shared/text/persian-text";
import { useFormValueNotification } from "../../../shared/presentation/use-form-value-notification";
import { countDigitsBefore, findCaretAfterDigits, formatDecimalAmount } from "./decimal-format";

export function normalizeDecimalInput(value: string): string {
  return normalizePersianNumerals(value).replace(/[,٬]/g, "").replace(/٫/g, ".");
}
type DecimalInputProps = { id: string; name: string; value: string; onValueChange: (value: string) => void; disabled?: boolean; invalid?: boolean; describedBy?: string; onKeyDown?: KeyboardEventHandler<HTMLInputElement> };
/** Grouped display and exact string transport, with no conversion through Number. */
export function DecimalInput({ id, name, value, onValueChange, disabled = false, invalid = false, describedBy, onKeyDown }: DecimalInputProps) {
  const inputRef = useRef<HTMLInputElement>(null), hiddenRef = useRef<HTMLInputElement>(null), caretPrefix = useRef<string | null>(null);
  const plain = normalizeDecimalInput(value);
  const formatted = /^-?\d*(\.\d*)?$/.test(plain) ? formatDecimalAmount(plain) : plain;
  useFormValueNotification(hiddenRef, plain);
  useLayoutEffect(() => {
    if (inputRef.current && caretPrefix.current !== null) {
      const prefix = caretPrefix.current;
      const caret = prefix.includes(".") && formatted.includes(".")
        ? formatted.indexOf(".") + 1 + prefix.slice(prefix.indexOf(".") + 1).length
        : prefix === "-" ? 1 : findCaretAfterDigits(formatted, countDigitsBefore(prefix, prefix.length));
      inputRef.current.setSelectionRange(caret, caret); caretPrefix.current = null;
    }
  }, [formatted]);
  return <><input ref={hiddenRef} type="hidden" name={name} value={plain} readOnly /><input ref={inputRef} id={id} type="text" inputMode="decimal" autoComplete="off" dir="ltr" className={formControlClassName} value={formatted} disabled={disabled} aria-invalid={invalid} aria-describedby={describedBy} onKeyDown={onKeyDown} onChange={event => {
    caretPrefix.current = normalizeDecimalInput(event.target.value.slice(0, event.target.selectionStart ?? event.target.value.length));
    onValueChange(normalizeDecimalInput(event.target.value));
  }} /></>;
}
