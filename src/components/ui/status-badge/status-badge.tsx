import styles from "./status-badge.module.css";

type StatusBadgeProps = {
  label: string;
  tone: "positive" | "negative";
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={tone === "positive" ? styles.positive : styles.negative}>
      {label}
    </span>
  );
}
