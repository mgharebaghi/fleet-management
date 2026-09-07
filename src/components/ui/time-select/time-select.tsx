"use client";

import { useEffect, useInsertionEffect, useRef, useState } from "react";

import { FieldLabel, formControlClassName } from "../form-field/form-field";
import styles from "./time-select.module.css";

type TimeSelectProps = {
  id: string;
  /** Name of the hidden field carrying the `HH:mm` value. */
  name: string;
  label: string;
  /** `HH:mm` the field starts on, if any. */
  defaultValue?: string;
  disabled?: boolean;
};

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

/** Latin digits are what the Application parses; the user reads Persian ones. */
function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function partsOf(value: string): { hour: string; minute: string } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? { hour: match[1], minute: match[2] } : { hour: "", minute: "" };
}

/**
 * A time field built from two native selects: they show Persian numerals, open
 * their list wherever the control is clicked, and work inside a modal without
 * any popover placement of our own. Choosing only an hour means the top of that
 * hour, so the submitted value is always a whole `HH:mm` or nothing at all.
 */
export function TimeSelect({
  id,
  name,
  label,
  defaultValue = "",
  disabled = false,
}: TimeSelectProps) {
  const [parts, setParts] = useState(() => partsOf(defaultValue));
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Same contract the searchable select documents: React runs the form's native
  // reset() after every action submission, and an insertion effect is the one
  // timing that commits before that reset reads this value.
  const defaultValueRef = useRef(defaultValue);
  useInsertionEffect(() => {
    defaultValueRef.current = defaultValue;
  });

  // Without this, a rejected submission would silently clear a time the user
  // already entered, even though the action echoes it back.
  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) {
      return;
    }

    function handleReset() {
      setParts(partsOf(defaultValueRef.current));
    }

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  const value = parts.hour === "" ? "" : `${parts.hour}:${parts.minute || "00"}`;

  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      {/* The Application only ever sees the canonical `HH:mm`. */}
      <input ref={hiddenInputRef} type="hidden" name={name} value={value} readOnly />

      <div className={styles.controlRow}>
        <select
          className={`${formControlClassName} ${styles.part}`}
          id={id}
          value={parts.hour}
          disabled={disabled}
          onChange={(event) => setParts((current) => ({ ...current, hour: event.target.value }))}
        >
          <option value="">ساعت</option>
          {hours.map((hour) => (
            <option key={hour} value={hour}>{toPersianDigits(hour)}</option>
          ))}
        </select>

        <span className={styles.separator} aria-hidden="true">:</span>

        <select
          className={`${formControlClassName} ${styles.part}`}
          aria-label={`دقیقهٔ ${label}`}
          value={parts.minute}
          disabled={disabled}
          onChange={(event) => setParts((current) => ({ ...current, minute: event.target.value }))}
        >
          <option value="">دقیقه</option>
          {minutes.map((minute) => (
            <option key={minute} value={minute}>{toPersianDigits(minute)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
