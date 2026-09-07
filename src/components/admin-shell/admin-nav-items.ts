export type AdminNavIconName =
  | "people"
  | "fleet"
  | "vehicle"
  | "insurance"
  | "catalog"
  | "drivers";

export type AdminNavChild = {
  label: string;
  href: string;
  icon: AdminNavIconName;
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
      { label: "خودروها", href: "/fleet/vehicles", icon: "vehicle" },
      {
        label: "بیمه ها",
        href: "/fleet/vehicle-insurances",
        icon: "insurance",
      },
      { label: "کاتالوگ‌ها", href: "/fleet/catalogs", icon: "catalog" },
    ],
  },
  { label: "رانندگان", href: "/drivers", icon: "drivers" },
];

/** A section/link counts as active for itself and everything nested under it. */
export function isAdminNavPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The most specific navigation label matching the current path, as
 * "ناوگان / خودروها". Used by the top bar to say where the user is; returns
 * null on a path no navigation entry covers, so nothing is invented.
 */
export function findAdminNavTrail(pathname: string): string[] | null {
  for (const section of ADMIN_NAV_SECTIONS) {
    const child = section.children?.find((candidate) =>
      isAdminNavPathActive(pathname, candidate.href),
    );

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
