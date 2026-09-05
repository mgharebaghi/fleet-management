import type { ReactNode } from "react";

import styles from "./action-button.module.css";

type ActionButtonProps = {
  variant?: "primary" | "secondary";
  /** "sm" suits dialogs and summary cards, "md" suits page-level forms. */
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  /** Shows a spinner and keeps the button busy while an action runs. */
  pending?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export function ActionButton({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  pending = false,
  onClick,
  children,
}: ActionButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {pending && <span className={styles.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
