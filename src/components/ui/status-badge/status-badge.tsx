import styles from "./status-badge.module.css";

export type StatusBadgeTone =
  | "positive"
  | "negative"
  | "warning"
  | "info"
  | "purple";

export type StatusBadgeProps = {
  pulse?: boolean;
  label: string;
  tone: StatusBadgeTone;
};

export function StatusBadge({ label, tone, pulse = false }: StatusBadgeProps) {
  return (
    <span className={pulse ? `${styles[tone]} ${styles.pulse}` : styles[tone]}>
      {label}
    </span>
  );
}
