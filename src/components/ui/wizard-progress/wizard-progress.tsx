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
          const state =
            index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "current"
                : "upcoming";
          return (
            <li
              key={step.id}
              className={styles.item}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              {index > 0 && (
                <span className={styles.connector} aria-hidden="true" />
              )}
              <span className={styles.marker}>{index + 1}</span>
              <span className={styles.label}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
