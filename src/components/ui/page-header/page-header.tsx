import type { ReactNode } from "react";

import styles from "./page-header.module.css";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  titleId?: string;
  description?: ReactNode;
  /**
   * Record pages put their subject's picture beside the title, so the page
   * heading itself carries the identity instead of repeating it in a second
   * profile block below.
   */
  avatar?: ReactNode;
  /** The page's primary action, aligned with the title on every page. */
  action?: ReactNode;
  /**
   * A compact action (e.g. an icon-only back control) keeps its own size
   * instead of stretching to the full width the mobile layout otherwise
   * gives every header action a comfortable tap target.
   */
  compactAction?: boolean;
};

/**
 * The one header every product page uses: the page's own identity on the
 * start side and its primary action opposite. The product brand belongs to
 * the panel's top bar, not to each page, so it is deliberately absent here.
 */
export function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  avatar,
  action,
  compactAction = false,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <div className={avatar ? styles.identity : undefined}>
          {avatar}
          <div className={styles.identityBody}>
            <h1 id={titleId}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
          </div>
        </div>
      </div>
      {action && (
        <div className={compactAction ? `${styles.action} ${styles.compactAction}` : styles.action}>
          {action}
        </div>
      )}
    </header>
  );
}
