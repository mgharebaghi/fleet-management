import type { ReactNode } from "react";

import styles from "./result-state.module.css";

type ResultStateProps = {
  /** "error" marks a failed read as an alert; "empty" is a normal outcome. */
  variant?: "empty" | "error";
  title: string;
  description: string;
  action?: ReactNode;
};

export function ResultState({
  variant = "empty",
  title,
  description,
  action,
}: ResultStateProps) {
  return (
    <div
      className={variant === "error" ? styles.errorState : styles.emptyState}
      role={variant === "error" ? "alert" : undefined}
    >
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
