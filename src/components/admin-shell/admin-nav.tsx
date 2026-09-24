"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";

import { Dialog } from "../ui/dialog/dialog";
import { LoadingIndicator } from "../ui/loading-indicator/loading-indicator";
import { AdminNavIcon } from "./admin-nav-icons";
import {
  ADMIN_NAV_SECTIONS,
  findActiveAdminNavChild,
  findAdminNavTrail,
  isAdminNavGroupPage,
  isAdminNavSectionActive,
  type AdminNavSection,
} from "./admin-nav-items";
import styles from "./admin-shell.module.css";

const numberFormatter = new Intl.NumberFormat("fa-IR");

type NavListProps = {
  pathname: string;
  idPrefix: string;
  pendingTripRequestsCount?: number;
  tripBadge?: ReactNode;
  tripQueueBadge?: ReactNode;
  onNavigate?: () => void;
};

/** The link list itself, shared by the desktop sidebar and the mobile drawer. */
function TripCount({
  pendingTripRequestsCount,
  tripBadge,
}: {
  pendingTripRequestsCount?: number;
  tripBadge?: ReactNode;
}) {
  if (tripBadge !== undefined) {
    return tripBadge;
  }

  if (pendingTripRequestsCount === undefined || pendingTripRequestsCount <= 0) {
    return null;
  }

  return (
    <span
      className={styles.navBadge}
      aria-label={`${numberFormatter.format(pendingTripRequestsCount)} درخواست جدید`}
    >
      {numberFormatter.format(pendingTripRequestsCount)}
    </span>
  );
}

function NavList({
  pathname,
  idPrefix,
  pendingTripRequestsCount,
  tripBadge,
  tripQueueBadge,
  onNavigate,
}: NavListProps) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [trackedPathname, setTrackedPathname] = useState(pathname);
  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    setOpened({});
  }

  function groupOpen(section: AdminNavSection) {
    const choice = opened[section.href];
    if (choice !== undefined) {
      return choice;
    }

    return isAdminNavSectionActive(pathname, section);
  }

  function toggleGroup(section: AdminNavSection) {
    setOpened((current) => ({
      ...current,
      [section.href]: !groupOpen(section),
    }));
  }

  return (
    <ul className={styles.navList}>
      {ADMIN_NAV_SECTIONS.map((section) => {
        const activeChild = findActiveAdminNavChild(pathname, section);
        const sectionActive = isAdminNavSectionActive(pathname, section);
        const groupIsPage = isAdminNavGroupPage(pathname, section);
        const open = section.children ? groupOpen(section) : false;
        const panelId = `${idPrefix}-${section.href.replaceAll("/", "-")}`;

        return (
          <li key={section.href} className={styles.navSection}>
            {section.children ? (
              <button
                type="button"
                className={styles.navLink}
                aria-expanded={open}
                aria-controls={panelId}
                aria-current={groupIsPage ? "page" : undefined}
                data-section-active={
                  sectionActive && !groupIsPage ? "true" : undefined
                }
                onClick={() => toggleGroup(section)}
              >
                <span className={styles.navIcon}>
                  <AdminNavIcon name={section.icon} />
                </span>
                <span className={styles.navLabel}>{section.label}</span>
                {section.href === "/trips" && (
                  <TripCount
                    pendingTripRequestsCount={pendingTripRequestsCount}
                    tripBadge={tripBadge}
                  />
                )}
                <NavChevron open={open} />
              </button>
            ) : (
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
            )}

            {section.children && (
              <div className={styles.navSubPanel} data-open={open ? "true" : undefined}>
              <ul
                className={styles.navSubList}
                id={panelId}
                inert={open ? undefined : true}
              >
                {section.children.map((child) => {
                  const childActive = activeChild?.href === child.href;

                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={
                          child.action
                            ? `${styles.navSubLink} ${styles.navAction}`
                            : styles.navSubLink
                        }
                        aria-current={childActive ? "page" : undefined}
                        onClick={onNavigate}
                      >
                        <span className={styles.navIcon}>
                          <AdminNavIcon name={child.icon} />
                        </span>
                        <span className={styles.navLabel}>{child.label}</span>
                        {child.includesTripFiles && (
                          <TripCount
                            pendingTripRequestsCount={pendingTripRequestsCount}
                            tripBadge={tripQueueBadge}
                          />
                        )}
                        {child.href === "/fleet/vehicles" && <VehicleListNavPending />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Client navigation into the vehicle list does not mount `(admin)/loading.tsx`
// while its RSC response is still in flight. Surface the same indicator in the
// content area for that link so the wait is visible.
function VehicleListNavPending() {
  const { pending } = useLinkStatus();
  if (!pending || typeof document === "undefined") return null;
  const content = document.querySelector("[data-admin-content]");
  if (!content) return null;
  return createPortal(
    <LoadingIndicator
      variant="page"
      label="در حال بارگذاری…"
      description="محتوای بخش مدیریت در حال آماده‌سازی است."
    />,
    content,
  );
}

function NavChevron({ open }: { open: boolean }) {
  return (
    <span className={styles.navChevron} data-open={open ? "true" : undefined} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

type AdminNavComponentProps = {
  pendingTripRequestsCount?: number;
  tripBadge?: ReactNode;
  tripQueueBadge?: ReactNode;
};

/** Always-visible desktop sidebar navigation; CSS hides it under the mobile breakpoint. */
export function AdminSidebarNav({
  pendingTripRequestsCount,
  tripBadge,
  tripQueueBadge,
}: AdminNavComponentProps = {}) {
  const pathname = usePathname() ?? "";

  return (
    <nav className={styles.sidebarNav} aria-label="پیمایش اصلی">
      <NavList
        pathname={pathname}
        idPrefix="sidebar"
        pendingTripRequestsCount={pendingTripRequestsCount}
        tripBadge={tripBadge}
        tripQueueBadge={tripQueueBadge}
      />
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
      <span>FleetManagement</span>
      <span className={styles.breadcrumbSeparator} aria-hidden="true">
        ‹
      </span>
      {trail.map((label, index) => (
        <span key={label}>
          {index > 0 && (
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              ‹
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
export function AdminMobileNav({
  pendingTripRequestsCount,
  tripBadge,
  tripQueueBadge,
}: AdminNavComponentProps = {}) {
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
          <NavList
            pathname={pathname}
            idPrefix="drawer"
            pendingTripRequestsCount={pendingTripRequestsCount}
            tripBadge={tripBadge}
            tripQueueBadge={tripQueueBadge}
            onNavigate={() => setOpen(false)}
          />
        </nav>
      </Dialog>
    </>
  );
}
