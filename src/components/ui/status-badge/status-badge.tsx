import styles from "./status-badge.module.css";

export type StatusBadgeTone =
  | "positive"
  | "negative"
  | "warning"
  | "info"
  | "purple";

export type StatusBadgeProps = {
  label: string;
  tone: StatusBadgeTone;
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={styles[tone]}>
      {label}
    </span>
  );
}
