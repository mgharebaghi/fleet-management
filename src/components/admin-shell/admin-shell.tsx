import type { ReactNode } from "react";

import { BrandMark } from "../ui/brand-mark/brand-mark";
import { AdminBreadcrumb, AdminMobileNav, AdminSidebarNav } from "./admin-nav";
import styles from "./admin-shell.module.css";

type AdminShellProps = {
  children: ReactNode;
};

/**
 * The panel's persistent chrome: a top bar carrying the product identity and
 * the current location, a right-aligned sidebar on desktop, and the same
 * navigation behind a drawer on narrow screens. It only arranges navigation
 * and content — every page keeps its own PageShell/PageHeader inside.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className={styles.shell} lang="fa" dir="rtl">
      <header className={styles.topBar}>
        <div className={styles.topBarStart}>
          <AdminMobileNav />
          <BrandMark />
        </div>
        <AdminBreadcrumb />
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar} aria-label="نوار کناری پنل مدیریت">
          <p className={styles.sidebarTitle}>بخش‌های سامانه</p>
          <AdminSidebarNav />
        </aside>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
