"use client";
import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NavigationLink } from "../navigation-link/navigation-link";
import { LoadingIndicator } from "../loading-indicator/loading-indicator";
import { isPlainNavigationClick } from "../../../shared/presentation/navigation-interaction";
import styles from "./record-tabs.module.css";
export type RecordTab = { id: string; label: string; href: string; icon?: ReactNode; tone?: "positive" | "negative" | "warning" | "info" };
export function RecordTabs({ label, active, tabs, children }: { label: string; active: string; tabs: readonly RecordTab[]; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className={styles.container}><nav className={styles.bar} aria-label={label}>{tabs.map(tab => <NavigationLink key={tab.id} href={tab.href} className={styles.link} data-active={tab.id === active ? "true" : undefined} data-tone={tab.tone} aria-current={tab.id === active ? "page" : undefined} scroll={false} onClick={event => {
    if (tab.id === active || !isPlainNavigationClick(event)) return;
    event.preventDefault(); startTransition(() => router.push(tab.href, { scroll: false }));
  }}>{tab.icon}<span>{tab.label}</span></NavigationLink>)}</nav><div className={styles.content} data-loading-panel>{children}{pending && <div className={styles.overlay}><LoadingIndicator /></div>}</div></div>;
}
