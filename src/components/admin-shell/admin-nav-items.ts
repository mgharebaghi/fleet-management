export type AdminNavIconName =
  | "people"
  | "fleet"
  | "vehicle"
  | "insurance"
  | "catalog"
  | "drivers"
  | "trips"
  | "create";

export type AdminNavChild = {
  label: string;
  href: string;
  icon: AdminNavIconName;
  /** A creation link, visually distinct from the other pages in its group. */
  action?: boolean;
  /** Trip workspace and voucher routes belong to the request list. */
  includesTripFiles?: boolean;
};

export type AdminNavSection = {
  label: string;
  href: string;
  icon: AdminNavIconName;
  children?: AdminNavChild[];
};

/**
 * The panel's sections, in the order they appear in the shell. Only routes
 * that already exist are listed here; a new top-level feature route earns an
 * entry once it exists, not before.
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  { label: "افراد", href: "/people", icon: "people" },
  {
    label: "ناوگان",
    href: "/fleet/vehicles",
    icon: "fleet",
    children: [
      { label: "خودروهای سازمان", href: "/fleet/vehicles", icon: "vehicle" },
      {
        label: "بیمه ها",
        href: "/fleet/vehicle-insurances",
        icon: "insurance",
      },
      { label: "کاتالوگ خودروها", href: "/fleet/catalogs", icon: "catalog" },
    ],
  },
  { label: "رانندگان", href: "/drivers", icon: "drivers" },
  {
    label: "سفرها",
    href: "/trips",
    icon: "trips",
    children: [
      {
        label: "ثبت درخواست سفر",
        href: "/trips/create",
        icon: "create",
        action: true,
      },
      {
        label: "فهرست درخواست‌ها",
        href: "/trips/requests",
        icon: "catalog",
        includesTripFiles: true,
      },
    ],
  },
];

/** A section/link counts as active for itself and everything nested under it. */
export function isAdminNavPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const tripFilePath = /^\/trips\/\d+(\/|$)/;

export function isAdminNavChildActive(
  pathname: string,
  child: AdminNavChild,
): boolean {
  if (child.includesTripFiles && tripFilePath.test(pathname)) {
    return true;
  }

  return isAdminNavPathActive(pathname, child.href);
}

/** The one child that should carry the primary current-page mark. */
export function findActiveAdminNavChild(
  pathname: string,
  section: AdminNavSection,
): AdminNavChild | undefined {
  return section.children
    ?.filter((child) => isAdminNavChildActive(pathname, child))
    .sort((left, right) => right.href.length - left.href.length)[0];
}

/** True when the group heading itself is the current page, not one of its children. */
export function isAdminNavGroupPage(
  pathname: string,
  section: AdminNavSection,
): boolean {
  return (
    !findActiveAdminNavChild(pathname, section) &&
    isAdminNavPathActive(pathname, section.href) &&
    !section.children?.some((child) => child.href === section.href)
  );
}

/**
 * The most specific navigation label matching the current path, as
 * "ناوگان / خودروها". Used by the top bar to say where the user is; returns
 * null on a path no navigation entry covers, so nothing is invented.
 */
export function findAdminNavTrail(pathname: string): string[] | null {
  for (const section of ADMIN_NAV_SECTIONS) {
    const child = findActiveAdminNavChild(pathname, section);

    if (child) {
      return [section.label, child.label];
    }

    if (isAdminNavPathActive(pathname, section.href)) {
      return [section.label];
    }
  }

  return null;
}

export function isAdminNavSectionActive(
  pathname: string,
  section: AdminNavSection,
): boolean {
  if (isAdminNavPathActive(pathname, section.href)) {
    return true;
  }

  return (
    section.children?.some((child) =>
      isAdminNavPathActive(pathname, child.href),
    ) ?? false
  );
}
