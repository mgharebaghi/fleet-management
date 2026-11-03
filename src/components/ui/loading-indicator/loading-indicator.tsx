import styles from "./loading-indicator.module.css";
import { ScopedLoading } from "./scoped-loading";

type LoadingIndicatorProps = {
  variant?: "inline" | "page";
  scope?: "panel" | "results";
};

export function LoadingIndicator({
  variant = "inline",
  scope = "panel",
}: LoadingIndicatorProps) {
  const indicator = (
    <div
      className={variant === "page" ? styles.page : styles.inline}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
      data-page-loading={variant === "page" ? "true" : undefined}
    >
      <div className={styles.surface}>
        <span className={styles.visual} aria-hidden="true">
          <span className={styles.spinner} />
        </span>
        <span className={styles.copy}>
          <strong>در حال بارگذاری</strong>
        </span>
      </div>
    </div>
  );
  return variant === "page" ? indicator : <ScopedLoading scope={scope}>{indicator}</ScopedLoading>;
}
