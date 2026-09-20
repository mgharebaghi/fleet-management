import { CheckIcon } from "../icon/icons";
import styles from "./wizard-progress.module.css";

export type WizardProgressStep = {
  id: string;
  label: string;
};

export type WizardProgressProps = {
  steps: readonly WizardProgressStep[];
  currentIndex: number;
  ariaLabel: string;
};

export function WizardProgress({
  steps,
  currentIndex,
  ariaLabel,
}: WizardProgressProps) {
  return (
    <nav className={styles.progress} aria-label={ariaLabel}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const state = isCurrent
            ? "current"
            : isComplete
              ? "complete"
              : "upcoming";

          const isConnectorBeforeComplete =
            index <= currentIndex && currentIndex > 0;
          const isConnectorAfterComplete = index + 1 <= currentIndex;

          return (
            <li
              key={step.id}
              className={styles.item}
              data-state={state}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div
                className={styles.markerTrack}
                data-next-complete={
                  isConnectorAfterComplete ? "true" : undefined
                }
              >
                {index > 0 && (
                  <span
                    className={`${styles.rail} ${styles.railStart}`}
                    data-state={
                      isConnectorBeforeComplete ? "complete" : "upcoming"
                    }
                    aria-hidden="true"
                  />
                )}
                {index < steps.length - 1 && (
                  <span
                    className={`${styles.rail} ${styles.railEnd}`}
                    data-state={
                      isConnectorAfterComplete ? "complete" : "upcoming"
                    }
                    aria-hidden="true"
                  />
                )}
                <span className={styles.marker} aria-hidden="true">
                  {isComplete ? (
                    <CheckIcon size={12} />
                  ) : isCurrent ? (
                    <span className={styles.currentDot} />
                  ) : (
                    <span className={styles.stepNumber}>{index + 1}</span>
                  )}
                </span>
              </div>

              <div className={styles.content}>
                <span className={styles.label}>{step.label}</span>
                {isCurrent && (
                  <span className={styles.currentBadge}>گام جاری</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
