"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

import { LoadingIndicator } from "../../../components/ui/loading-indicator/loading-indicator";
import { isPlainNavigationClick, rtlTabIndex } from "../../../shared/presentation/navigation-interaction";
import styles from "./driver-pages.module.css";

export const DRIVER_RECORD_TABS = [
  { id: "licenses", label: "گواهینامه‌ها" },
  { id: "assignments", label: "تخصیص خودرو" },
  { id: "history", label: "سوابق تخصیص" },
] as const;

export type DriverRecordTab = (typeof DRIVER_RECORD_TABS)[number]["id"];

export function driverRecordTabHref(driverId: number, tab: DriverRecordTab) {
  return `/drivers/${driverId}?tab=${tab}`;
}

export function DriverRecordTabs({
  driverId,
  active,
  counts,
  children,
}: {
  driverId: number;
  active: DriverRecordTab;
  counts: Record<DriverRecordTab, number>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ids = DRIVER_RECORD_TABS.map((tab) => tab.id);

  function openTab(tab: DriverRecordTab) {
    if (tab === active) return;
    startTransition(() => {
      router.push(driverRecordTabHref(driverId, tab), { scroll: false });
    });
  }

  function onTabClick(event: MouseEvent<HTMLAnchorElement>, tab: DriverRecordTab) {
    if (tab === active || !isPlainNavigationClick(event)) return;
    event.preventDefault();
    openTab(tab);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role="tab"]'));
    const index = tabs.indexOf(event.target as HTMLAnchorElement);
    const next = rtlTabIndex(event.key, index < 0 ? ids.indexOf(active) : index, ids.length);
    if (next === null) return;
    event.preventDefault();
    tabs[next]?.focus();
    const tab = ids[next];
    if (tab) openTab(tab);
  }

  return (
    <>
      <div className={styles.tabBar} role="tablist" aria-label="بخش‌های پرونده راننده" onKeyDown={onKeyDown}>
        {DRIVER_RECORD_TABS.map((tab) => {
          const selected = tab.id === active;
          const count = counts[tab.id];
          const label = count > 0 ? `${tab.label} (${new Intl.NumberFormat("fa-IR").format(count)})` : tab.label;
          return (
            <Link
              key={tab.id}
              href={driverRecordTabHref(driverId, tab.id)}
              className={styles.tabLink}
              role="tab"
              id={`driver-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`driver-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              data-active={selected ? "true" : undefined}
              scroll={false}
              prefetch={false}
              onClick={(event) => onTabClick(event, tab.id)}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <div className={styles.tabContentArea} aria-busy={isPending || undefined}>
        {children}
        {isPending && (
          <div className={styles.tabLoadingOverlay}>
            <div className={styles.tabLoadingCard}>
              <LoadingIndicator label="در حال بارگذاری بخش…" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
