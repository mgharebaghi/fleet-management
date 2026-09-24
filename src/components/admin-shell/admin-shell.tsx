import type { ReactNode } from "react";

import { BrandMark } from "../ui/brand-mark/brand-mark";
import { AdminBreadcrumb, AdminMobileNav, AdminSidebarNav } from "./admin-nav";
import { ThemeToggle, TopDate } from "./theme-toggle";
import styles from "./admin-shell.module.css";

type AdminShellProps = {
  children: ReactNode;
  pendingTripRequestsCount?: number;
  tripBadge?: ReactNode;
  tripQueueBadge?: ReactNode;
};

/**
 * Persistent chrome: a full-height sidebar and a top bar that stay fixed.
 * Only the page region scrolls.
 */
export function AdminShell({
  children,
  pendingTripRequestsCount,
  tripBadge,
  tripQueueBadge,
}: AdminShellProps) {
  return (
    <div className={styles.app} lang="fa" dir="rtl" data-admin-shell>
      <aside className={styles.sidebar} aria-label="نوار کناری پنل مدیریت" data-admin-chrome>
        <div className={styles.brandSlot}>
          <BrandMark />
        </div>
        <p className={styles.sidebarTitle}>مدیریت عملیات</p>
        <AdminSidebarNav
          pendingTripRequestsCount={pendingTripRequestsCount}
          tripBadge={tripBadge}
          tripQueueBadge={tripQueueBadge}
        />
      </aside>

      <div className={styles.shell}>
        <header className={styles.topBar} data-admin-chrome>
          <div className={styles.topBarStart}>
            <AdminMobileNav
              pendingTripRequestsCount={pendingTripRequestsCount}
              tripBadge={tripBadge}
              tripQueueBadge={tripQueueBadge}
            />
            <AdminBreadcrumb />
          </div>
          <div className={styles.topActions}>
            <TopDate />
            <ThemeToggle />
          </div>
        </header>
        <div className={styles.content} data-admin-content>
          {children}
        </div>
      </div>
    </div>
  );
}
