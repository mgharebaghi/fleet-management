import type { AdminNavIconName } from "./admin-nav-items";

/**
 * One glyph per navigation entry, drawn inline for the same reason the shared
 * action icons are: a handful of marks does not justify an icon dependency.
 * They are decorative — each link's text is its accessible name.
 */
function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const NAV_ICONS: Record<AdminNavIconName, React.ReactNode> = {
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.6-3.1 2.9-4.8 5.5-4.8s4.9 1.7 5.5 4.8" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17.4 14.9c2 .5 3.4 2.1 3.9 4.6" />
    </>
  ),
  fleet: (
    <>
      <path d="M2.8 16.2V7.8a1 1 0 0 1 1-1h9.4a1 1 0 0 1 1 1v8.4" />
      <path d="M14.2 10h3.1l3.9 3.4v2.8" />
      <circle cx="7.4" cy="17.4" r="1.9" />
      <circle cx="16.8" cy="17.4" r="1.9" />
      <path d="M9.3 17.4h5.6M2.8 17.4h2.7M18.7 17.4h2.3" />
    </>
  ),
  vehicle: (
    <>
      <path d="M3.4 15.4v-2.1l1.9-4.4a1.6 1.6 0 0 1 1.5-1h10.4a1.6 1.6 0 0 1 1.5 1l1.9 4.4v2.1" />
      <path d="M3.4 13.3h17.2" />
      <circle cx="7.2" cy="16.4" r="1.7" />
      <circle cx="16.8" cy="16.4" r="1.7" />
    </>
  ),
  insurance: (
    <>
      <path d="M12 3.6l7 2.6v5.3c0 4-2.8 7-7 8.9-4.2-1.9-7-4.9-7-8.9V6.2l7-2.6z" />
      <path d="M9.2 12.1l2 2 3.6-3.9" />
    </>
  ),
  catalog: (
    <>
      <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" />
      <circle cx="8.2" cy="6.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="13.6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  drivers: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.7v5.2M5 16.1l4.4-2.6M19 16.1l-4.4-2.6" />
    </>
  ),
};

export function AdminNavIcon({ name }: { name: AdminNavIconName }) {
  return <NavIcon>{NAV_ICONS[name]}</NavIcon>;
}
