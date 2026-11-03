import styles from "./progress-bar.module.css";
export function ProgressBar({ value, label, tone = "info" }: { value: number | null; label: string; tone?: "info" | "warning" | "negative" }) {
  return value === null ? <div className={styles.track} aria-label={label} /> : <progress className={styles.progress} data-tone={tone} value={Math.max(0, Math.min(100, value))} max={100} aria-label={label} />;
}
