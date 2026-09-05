import type { ReactNode } from "react";

import styles from "./form-grid.module.css";

type FormGridProps = {
  /**
   * Even columns for plain forms; twelve when a feature needs to give its
   * fields business-driven widths through its own span classes.
   */
  columns?: 2 | 12;
  children: ReactNode;
};

export function FormGrid({ columns = 2, children }: FormGridProps) {
  return (
    <div className={styles.grid} data-columns={columns}>
      {children}
    </div>
  );
}
