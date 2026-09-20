"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AdminNavIcon } from "../../../../components/admin-shell/admin-nav-icons";
import {
  CheckIcon,
  ViewIcon,
  WarningIcon,
} from "../../../../components/ui/icon/icons";
import { LoadingIndicator } from "../../../../components/ui/loading-indicator/loading-indicator";
import {
  WORKSPACE_TAB_LABELS,
  WORKSPACE_TAB_ORDER,
  workspaceFinalTabMeta,
  workspaceTabHref,
  type WorkspaceSectionId,
} from "./trip-workspace-view";
import styles from "./trip-workspace.module.css";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function TripWorkspaceTabs({
  tripRequestId,
  activeSection,
  tripRequestStatus = "New",
  children,
}: {
  tripRequestId: number;
  activeSection: WorkspaceSectionId;
  tripRequestStatus?: string;
  children?: React.ReactNode;
}) {
  const router = useSafeRouter();
  const [isPending, startTransition] = useTransition();

  const handleTabClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    isActive: boolean,
  ) => {
    if (isActive || !router) return;
    e.preventDefault();
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  return (
    <div className={styles.tabNavContainer}>
      <nav className={styles.tabBar} aria-label="بخش‌های پرونده سفر">
        {WORKSPACE_TAB_ORDER.map((section) => {
          const href = workspaceTabHref(tripRequestId, section);
          const active = section === activeSection;
          const isFinalTab = section === "completion";
          const finalMeta = isFinalTab
            ? workspaceFinalTabMeta(tripRequestStatus)
            : null;
          const label = finalMeta ? finalMeta.label : WORKSPACE_TAB_LABELS[section];
          const tone = finalMeta ? finalMeta.tone : undefined;

          return (
            <Link
              key={section}
              href={href}
              className={styles.tabLink}
              data-active={active ? "true" : undefined}
              data-tone={tone}
              aria-current={active ? "page" : undefined}
              scroll={false}
              onClick={(e) => handleTabClick(e, href, active)}
            >
              {section === "details" && <ViewIcon />}
              {section === "passengers" && <AdminNavIcon name="people" />}
              {section === "assignment" && <AdminNavIcon name="drivers" />}
              {section === "route" && <AdminNavIcon name="fleet" />}
              {section === "completion" && finalMeta?.iconName === "check" && (
                <CheckIcon />
              )}
              {section === "completion" && finalMeta?.iconName === "warning" && (
                <WarningIcon />
              )}
              {section === "completion" && finalMeta?.iconName === "trips" && (
                <AdminNavIcon name="trips" />
              )}
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.tabContentArea}>
        {children}
        {isPending && (
          <div className={styles.tabLoadingOverlay} role="status" aria-live="polite">
            <div className={styles.tabLoadingCard}>
              <LoadingIndicator label="در حال بارگذاری بخش…" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
