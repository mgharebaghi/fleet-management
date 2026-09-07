import Link from "next/link";

import { BackIcon } from "../icon/icons";
import styles from "./back-link.module.css";

type BackLinkProps = {
  href: string;
  /**
   * The Persian accessible name, e.g. "بازگشت به اشخاص". It is both the
   * screen-reader name and the pointer tooltip, so the control never depends
   * on its arrow alone to say where it leads.
   */
  label: string;
};

/**
 * The one back control every create/edit/detail page uses, sitting at the
 * start of the page header opposite the title. It is icon-only on purpose —
 * the destination lives in the accessible name — and heavier than a row's
 * icon action, because leaving the page is a page-level move, not a row one.
 */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link className={styles.back} href={href} title={label} aria-label={label}>
      <BackIcon size={18} />
    </Link>
  );
}
