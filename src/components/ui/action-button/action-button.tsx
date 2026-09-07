import type { ReactNode } from "react";

import styles from "./action-button.module.css";

type ActionButtonProps = {
  variant?: "primary" | "secondary" | "danger";
  /** "sm" suits dialogs and summary cards, "md" suits page-level forms. */
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  /** Shows a spinner and keeps the button busy while an action runs. */
  pending?: boolean;
  /**
   * Submits the form with this id instead of an ancestor one, so a
   * confirmation dialog can submit the form it was opened from.
   */
  form?: string;
  onClick?: () => void;
  children: ReactNode;
};

export function ActionButton({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  pending = false,
  form,
  onClick,
  children,
}: ActionButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      type={type}
      form={form}
      disabled={disabled}
      onClick={onClick}
    >
      {pending && <span className={styles.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
