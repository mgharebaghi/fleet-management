import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./icon-action-button.module.css";

type IconActionTone = "neutral" | "danger";

type IconActionSharedProps = {
  /**
   * The control's Persian accessible name ("ویرایش", "حذف"). It is both the
   * screen-reader name and the pointer tooltip, so a row action never depends
   * on the icon alone to say what it does.
   */
  label: string;
  icon: ReactNode;
  tone?: IconActionTone;
};

/**
 * A compact square control for per-row actions in tables, cards and list
 * dialogs. Rows carry several of these side by side, so they trade the full
 * ActionButton's text for an icon while keeping a 40px touch target and a
 * visible name for assistive technology and on hover.
 */
export function IconActionButton({
  label,
  icon,
  tone = "neutral",
  onClick,
  disabled = false,
  type = "button",
}: IconActionSharedProps & {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      className={`${styles.action} ${styles[tone]}`}
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

/** The same control as a navigation link, for actions that open a page. */
export function IconActionLink({
  label,
  icon,
  tone = "neutral",
  href,
}: IconActionSharedProps & { href: string }) {
  return (
    <Link
      className={`${styles.action} ${styles[tone]}`}
      href={href}
      title={label}
      aria-label={label}
    >
      {icon}
    </Link>
  );
}

/** Keeps a row's icon actions on one line with consistent spacing. */
export function IconActionGroup({ children }: { children: ReactNode }) {
  return <div className={styles.group}>{children}</div>;
}
