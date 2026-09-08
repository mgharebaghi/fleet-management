import type { ReactNode } from "react";

import { FieldLabel, formControlClassName } from "../form-field/form-field";
import { LoadingIndicator } from "../loading-indicator/loading-indicator";
import styles from "./list-filter-bar.module.css";

type ListFilterBarProps = {
  children: ReactNode;
  /** A filter navigation is in flight; shows a compact shared indicator below the bar. */
  pending?: boolean;
  pendingLabel?: string;
};

/**
 * Rendered as a sibling of `.bar`, not inside it — `.bar` relies on
 * `:last-child` to push the clear affordance to the end, and an indicator
 * appended after it would hijack that rule instead of the clear link.
 */
export function ListFilterBar({
  children,
  pending = false,
  pendingLabel = "در حال به‌روزرسانی نتایج…",
}: ListFilterBarProps) {
  return (
    <>
      <div className={styles.bar}>{children}</div>
      {pending && (
        <div className={styles.pendingRow}>
          <LoadingIndicator label={pendingLabel} />
        </div>
      )}
    </>
  );
}

/**
 * Explicit label association: a wrapping label would fold a select's chosen
 * option into the control's accessible name.
 */
function getFieldId(name: string): string {
  return `filter-${name}`;
}

type ListSearchFieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function ListSearchField({
  label,
  name,
  value,
  placeholder,
  onChange,
}: ListSearchFieldProps) {
  const fieldId = getFieldId(name);

  return (
    <div className={styles.searchField}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <input
        className={formControlClassName}
        id={fieldId}
        type="search"
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type ListSelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function ListSelectField({
  label,
  name,
  value,
  onChange,
  children,
}: ListSelectFieldProps) {
  const fieldId = getFieldId(name);

  return (
    <div className={styles.selectField}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <select
        className={formControlClassName}
        id={fieldId}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
