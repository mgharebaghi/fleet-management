"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Dialog } from "../ui/dialog/dialog";
import { AdminNavIcon } from "./admin-nav-icons";
import {
  ADMIN_NAV_SECTIONS,
  findAdminNavTrail,
  isAdminNavPathActive,
  isAdminNavSectionActive,
} from "./admin-nav-items";
import styles from "./admin-shell.module.css";

type NavListProps = {
  pathname: string;
  onNavigate?: () => void;
};

/** The link list itself, shared by the desktop sidebar and the mobile drawer. */
function NavList({ pathname, onNavigate }: NavListProps) {
  return (
    <ul className={styles.navList}>
      {ADMIN_NAV_SECTIONS.map((section) => {
        const sectionActive = isAdminNavSectionActive(pathname, section);

        return (
          <li key={section.href} className={styles.navSection}>
            <Link
              href={section.href}
              className={styles.navLink}
              aria-current={sectionActive ? "page" : undefined}
              onClick={onNavigate}
            >
              <span className={styles.navIcon}>
                <AdminNavIcon name={section.icon} />
              </span>
              <span className={styles.navLabel}>{section.label}</span>
            </Link>

            {section.children && (
              <ul className={styles.navSubList}>
                {section.children.map((child) => {
                  const childActive = isAdminNavPathActive(
                    pathname,
                    child.href,
                  );

                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={styles.navSubLink}
                        aria-current={childActive ? "page" : undefined}
                        onClick={onNavigate}
                      >
                        <span className={styles.navIcon}>
                          <AdminNavIcon name={child.icon} />
                        </span>
                        <span className={styles.navLabel}>{child.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Always-visible desktop sidebar navigation; CSS hides it under the mobile breakpoint. */
export function AdminSidebarNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className={styles.sidebarNav} aria-label="پیمایش اصلی">
      <NavList pathname={pathname} />
    </nav>
  );
}

/** Where the user is, as the navigation itself names it. */
export function AdminBreadcrumb() {
  const pathname = usePathname() ?? "";
  const trail = findAdminNavTrail(pathname);

  if (!trail) {
    return null;
  }

  return (
    <p className={styles.breadcrumb}>
      {trail.map((label, index) => (
        <span key={label}>
          {index > 0 && (
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              /
            </span>
          )}
          {label}
        </span>
      ))}
    </p>
  );
}

/**
 * The narrow-screen entry point to the same navigation: a button in the top
 * bar that opens the links as a modal drawer. It reuses the shared Dialog so
 * the drawer inherits its focus trap, Escape handling and scroll lock instead
 * of growing a second set of them, and it closes itself on every navigation.
 */
export function AdminMobileNav() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  // Adjusted during render (not an effect) so the drawer closes on the same
  // commit as the navigation, without an extra render-then-reset flash.
  const [trackedPathname, setTrackedPathname] = useState(pathname);
  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.mobileToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={styles.mobileToggleIcon} aria-hidden="true" />
        <span className={styles.visuallyHidden}>پیمایش</span>
      </button>

      <Dialog
        id="admin-mobile-nav-panel"
        open={open}
        onClose={() => setOpen(false)}
        titleId="admin-mobile-nav-title"
        title="پنل مدیریت"
        size="drawer"
      >
        <nav aria-label="پیمایش اصلی (موبایل)">
          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </Dialog>
    </>
  );
}
