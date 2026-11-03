import type { ReactNode } from "react";

import styles from "./data-table.module.css";

type DataTableProps = {
  /** Screen-reader caption naming the listing the table represents. */
  caption: string;
  /** Keeps the final RTL action column visually separated from record data. */
  stickyActions?: boolean;
  children: ReactNode;
};

export const dataTableClassName = styles.table;

export function DataTable({ caption, stickyActions = false, children }: DataTableProps) {
  return (
    <div className={styles.frame} data-loading-results>
      <table className={[styles.table, stickyActions && styles.stickyActions].filter(Boolean).join(" ")}>
        <caption className={styles.caption}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
