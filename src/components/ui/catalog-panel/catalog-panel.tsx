import type { ReactNode } from "react";
import styles from "./catalog-panel.module.css";

type CatalogPanelProps = {
  titleId: string;
  title: string;
  description?: string;
  count?: number;
  inactiveCount?: number;
  actions?: ReactNode;
  children: ReactNode;
};

const formatter = new Intl.NumberFormat("fa-IR");

/** Catalog appearance only; record fields, dialogs and rules stay in the feature. */
export function CatalogPanel({ titleId, title, description, count, inactiveCount = 0, actions, children }: CatalogPanelProps) {
  return <section className={styles.card} aria-labelledby={titleId}>
    <header className={styles.header}>
      <h2 id={titleId}>{title}</h2>
      {description && <p>{description}</p>}
    </header>
    {count !== undefined && <div className={styles.counts}>
      <p className={styles.count}>{formatter.format(count)} مورد ثبت‌شده</p>
      {inactiveCount > 0 && <p className={styles.inactiveCount}>{formatter.format(inactiveCount)} مورد غیرفعال</p>}
    </div>}
    {actions && <div className={styles.actions}>{actions}</div>}
    {children}
  </section>;
}
