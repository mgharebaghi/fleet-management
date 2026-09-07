import styles from "./status-timeline.module.css";

export type StatusTimelineTone = "positive" | "warning" | "negative" | "info";

type StatusTimelineProps = {
  tone: StatusTimelineTone;
  statusLabel: string;
  startLabel: string;
  endLabel: string;
  /** Fraction of the period elapsed, 0 to 1. Omit or pass null for an open end. */
  progress?: number | null;
};

/**
 * A compact bounded-period indicator: a status label above a filled track and
 * the period's own start/end text below it. Any feature with a from/to (or
 * issue/expiry) pair supplies the tone, label and progress it has already
 * computed from its own dates — this component only draws the result.
 */
export function StatusTimeline({ tone, statusLabel, startLabel, endLabel, progress = null }: StatusTimelineProps) {
  const clamped = progress === null ? null : Math.min(1, Math.max(0, progress));
  return (
    <div className={styles.timeline}>
      <span className={styles.statusLabel} data-tone={tone}>{statusLabel}</span>
      <div className={styles.track} role="img" aria-label={`${startLabel} — ${endLabel}`}>
        <div
          className={clamped === null ? `${styles.fill} ${styles.fillOpenEnded}` : styles.fill}
          data-tone={tone}
          style={clamped === null ? undefined : { width: `${clamped * 100}%` }}
        />
      </div>
      <div className={styles.bounds}>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
