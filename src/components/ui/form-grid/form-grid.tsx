import type { ReactNode } from "react";

import styles from "./form-grid.module.css";

type FormGridProps = {
  /**
   * Even columns for plain forms; twelve when a feature needs to give its
   * fields business-driven widths through its own span classes.
   */
  columns?: 2 | 12;
  className?: string;
  children: ReactNode;
};

export function FormGrid({ columns = 2, children, className }: FormGridProps) {
  return (
    <div className={[styles.grid, className].filter(Boolean).join(" ")} data-columns={columns}>
      {children}
    </div>
  );
}
