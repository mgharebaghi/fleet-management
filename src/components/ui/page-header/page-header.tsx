import type { ReactNode } from "react";

import { BrandMark } from "../brand-mark/brand-mark";
import styles from "./page-header.module.css";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  titleId?: string;
  description?: ReactNode;
  /** The page's primary action, aligned with the title on every page. */
  action?: ReactNode;
};

/**
 * The one header every product page uses: the brand mark facing the page's
 * own identity in a single balanced row. Pages never place the brand
 * themselves, so it cannot drift between them.
 */
export function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {/* First in the DOM so mobile stacks the brand above the page
          identity; desktop repositions it to the opposite side with grid
          placement, independent of source order. */}
      <div className={styles.brandColumn}>
        <BrandMark />
        {action && <div className={styles.action}>{action}</div>}
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </header>
  );
}
