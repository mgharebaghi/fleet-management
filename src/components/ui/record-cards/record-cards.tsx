import type { ReactNode } from "react";

import styles from "./record-cards.module.css";

/**
 * The narrow-viewport counterpart of a DataTable: one card per record, hidden
 * wherever the table is shown. Which values a card carries stays with the
 * feature; this module owns only the surface, spacing and label typography.
 */
export function RecordCardList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>;
}

export function RecordCard({ children }: { children: ReactNode }) {
  return <li className={styles.card}>{children}</li>;
}

type RecordCardHeaderProps = {
  title: ReactNode;
  badge?: ReactNode;
};

export function RecordCardHeader({ title, badge }: RecordCardHeaderProps) {
  return (
    <div className={styles.header}>
      <p className={styles.title}>{title}</p>
      {badge}
    </div>
  );
}

export function RecordCardDetails({ children }: { children: ReactNode }) {
  return <dl className={styles.details}>{children}</dl>;
}

type RecordCardDetailProps = {
  label: string;
  children: ReactNode;
};

export function RecordCardDetail({ label, children }: RecordCardDetailProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
