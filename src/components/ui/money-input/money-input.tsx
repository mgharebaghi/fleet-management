"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { FieldLabel, formControlClassName } from "../form-field/form-field";
import {
  countDigitsBefore,
  findCaretAfterDigits,
  formatMoneyAmount,
  normalizeMoneyAmount,
} from "./money-amount";
import styles from "./money-input.module.css";

export const MONEY_UNIT_LABEL = "تومان";

type MoneyInputProps = {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * A money field: grouped digits while typing, the plain decimal submitted to
 * the Application, and the currency stated in the field's own name so it is
 * never left to a placeholder.
 */
export function MoneyInput({
  id,
  name,
  label,
  defaultValue = "",
  disabled = false,
  invalid = false,
  describedBy,
}: MoneyInputProps) {
  const [amount, setAmount] = useState(() =>
    normalizeMoneyAmount(defaultValue),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigitsRef = useRef<number | null>(null);
  const formattedAmount = formatMoneyAmount(amount);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const caretDigits = caretDigitsRef.current;

    if (input === null || caretDigits === null) {
      return;
    }

    caretDigitsRef.current = null;
    const caret = findCaretAfterDigits(input.value, caretDigits);
    input.setSelectionRange(caret, caret);
  }, [formattedAmount]);

  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={id}>
        {label} ({MONEY_UNIT_LABEL})
      </FieldLabel>

      {/* The Application only ever sees the plain decimal. */}
      <input type="hidden" name={name} value={amount} readOnly />

      <div className={styles.controlRow}>
        <input
          className={`${formControlClassName} ${styles.amountInput}`}
          id={id}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={formattedAmount}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => {
            caretDigitsRef.current = countDigitsBefore(
              event.target.value,
              event.target.selectionStart ?? event.target.value.length,
            );
            setAmount(normalizeMoneyAmount(event.target.value));
          }}
        />
        <span className={styles.unit} aria-hidden="true">
          {MONEY_UNIT_LABEL}
        </span>
      </div>
    </div>
  );
}
