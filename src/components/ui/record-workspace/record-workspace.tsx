import type { ReactNode } from "react";
import styles from "./record-workspace.module.css";

export function RecordWorkspace({ children }: { children: ReactNode }) {
  return <div className={styles.workspaceBody}>{children}</div>;
}

export function RecordSidePanel({ title, summary, lead, hint, warning = false, action, children }: {
  title: string; summary?: ReactNode; lead?: ReactNode; hint?: ReactNode; warning?: boolean; action?: ReactNode; children?: ReactNode;
}) {
  return <aside className={styles.sideColumn} aria-label={title}>
    <section className={styles.nextPanel}>
      <h2>{title}</h2>
      {summary}
      {lead && <p className={warning ? styles.warningNote : styles.infoNote}>{lead}</p>}
      {hint && <p className={styles.nextHint}>{hint}</p>}
      {action}
      {children}
    </section>
  </aside>;
}

export function RecordProgress({ title, items, layout = "vertical" }: { title: string; layout?: "vertical" | "horizontal"; items: { id: string; label: ReactNode; detail: ReactNode }[] }) {
  return <div className={styles.statusTrack} data-layout={layout}><h3>{title}</h3><ol className={styles.historyList}>
    {items.map(item => <li key={item.id}><b>{item.label}</b><div>{item.detail}</div></li>)}
  </ol></div>;
}
