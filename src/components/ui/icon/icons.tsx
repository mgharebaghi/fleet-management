import styles from "./icons.module.css";

/**
 * The small inline glyphs used by action controls and confirmations. They are
 * plain stroke SVGs drawn in `currentColor` on a 24-unit grid, so a control
 * only has to set its own colour and font size to place one — the project
 * carries no icon dependency, and does not need one for a handful of marks.
 *
 * Every icon here is decorative: the control that renders it owns the
 * accessible name, so each one is hidden from assistive technology.
 */
type IconProps = {
  /** Rendered size in pixels; defaults to the 16px control glyph size. */
  size?: number;
};

function Icon({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l4 4" />
    </Icon>
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10.5 11v6M13.5 11v6" />
    </Icon>
  );
}

export function ViewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </Icon>
  );
}

/**
 * The left-pointing arrow used by "back to the previous page" controls.
 * Callers own the accessible name; this glyph is purely decorative.
 */
export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5l8.5 14.5H3.5L12 4.5z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Icon>
  );
}
