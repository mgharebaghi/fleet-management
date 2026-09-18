"use client";

import Link from "next/link";

import {
  WORKSPACE_TAB_LABELS,
  WORKSPACE_TAB_ORDER,
  workspaceTabHref,
  type WorkspaceSectionId,
} from "./trip-workspace-view";
import styles from "./trip-workspace.module.css";

export function TripWorkspaceTabs({
  tripRequestId,
  activeSection,
}: {
  tripRequestId: number;
  activeSection: WorkspaceSectionId;
}) {
  return (
    <nav className={styles.tabBar} aria-label="بخش‌های پرونده سفر">
      {WORKSPACE_TAB_ORDER.map((section) => {
        const href = workspaceTabHref(tripRequestId, section);
        const active = section === activeSection;
        return (
          <Link
            key={section}
            href={href}
            className={styles.tabLink}
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
            scroll={false}
          >
            {WORKSPACE_TAB_LABELS[section]}
          </Link>
        );
      })}
    </nav>
  );
}
