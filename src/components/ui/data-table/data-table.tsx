import type { ReactNode } from "react";

import styles from "./data-table.module.css";

type DataTableProps = {
  /** Screen-reader caption naming the listing the table represents. */
  caption: string;
  /** Width below which the frame scrolls instead of squeezing columns. */
  minWidth?: number;
  children: ReactNode;
};

export function DataTable({ caption, minWidth = 680, children }: DataTableProps) {
  return (
    <div className={styles.frame}>
      <table className={styles.table} style={{ minWidth: `${minWidth}px` }}>
        <caption className={styles.caption}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
