import type { ReactNode } from "react";

import styles from "./form-field.module.css";

/**
 * Shared appearance for raw `input`, `select` and `textarea` elements. Features
 * keep their own markup and layout and only borrow the control's look, so no
 * validation or form-data concern crosses into this module.
 */
export const formControlClassName = styles.control;

type FormFieldProps = {
  /** Lets a feature add its own grid placement without restyling the stack. */
  className?: string;
  children: ReactNode;
};

/** The stack a single field occupies: label, control and any error beneath it. */
export function FormField({ className, children }: FormFieldProps) {
  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      {children}
    </div>
  );
}

type FieldLabelProps = {
  htmlFor: string;
  /** Marks the field as required with the shared asterisk treatment. */
  required?: boolean;
  children: ReactNode;
};

export function FieldLabel({ htmlFor, required, children }: FieldLabelProps) {
  // The marker stays outside the label so it never joins its accessible name.
  return (
    <div className={styles.labelRow}>
      <label className={styles.label} htmlFor={htmlFor}>
        {children}
      </label>
      {required && (
        <span className={styles.requiredMark} aria-hidden="true">
          *
        </span>
      )}
    </div>
  );
}

type FieldErrorsProps = {
  id: string;
  messages: readonly string[];
};

export function FieldErrors({ id, messages }: FieldErrorsProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={styles.fieldErrors} id={id} role="alert">
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

type FieldHintProps = {
  id?: string;
  children: ReactNode;
};

/** Short guidance that belongs to the field above it, not to the whole form. */
export function FieldHint({ id, children }: FieldHintProps) {
  return (
    <p className={styles.hint} id={id}>
      {children}
    </p>
  );
}

type FormSectionProps = {
  title?: string;
  titleId?: string;
  description?: string;
  /** A compact note, such as the required-field key, aligned with the title. */
  aside?: ReactNode;
  children: ReactNode;
};

/** A tight group of related fields. Feature forms keep their own fields inside. */
export function FormSection({
  title,
  titleId,
  description,
  aside,
  children,
}: FormSectionProps) {
  return (
    <section className={styles.section}>
      {(title || description || aside) && (
        <header className={styles.sectionHeader}>
          <div>
            {title && (
              <h2 className={styles.sectionTitle} id={titleId}>
                {title}
              </h2>
            )}
            {description && <p className={styles.sectionDescription}>{description}</p>}
          </div>
          {aside}
        </header>
      )}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

type FormActionsProps = {
  /** Separates the actions from the fields above them on page-level forms. */
  separated?: boolean;
  children: ReactNode;
};

export function FormActions({ separated = false, children }: FormActionsProps) {
  return (
    <div className={separated ? styles.separatedActions : styles.actions}>
      {children}
    </div>
  );
}
