import styles from "./loading-indicator.module.css";

type LoadingIndicatorProps = {
  label?: string;
  description?: string;
  variant?: "inline" | "page";
};

export function LoadingIndicator({
  label = "در حال بارگذاری…",
  description,
  variant = "inline",
}: LoadingIndicatorProps) {
  return (
    <div
      className={variant === "page" ? styles.page : styles.inline}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
    >
      <div className={styles.surface}>
        <span className={styles.visual} aria-hidden="true">
          <span className={styles.spinner} />
        </span>
        <span className={styles.copy}>
          <strong>{label}</strong>
          {description && <span>{description}</span>}
        </span>
      </div>
    </div>
  );
}
