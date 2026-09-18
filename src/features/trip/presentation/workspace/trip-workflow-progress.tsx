import { CheckIcon } from "@/components/ui/icon/icons";
import styles from "./trip-workspace.module.css";
import type { WorkflowStageView } from "./trip-workspace-view";

export function TripWorkflowProgress({
  stages,
}: {
  stages: WorkflowStageView[];
}) {
  return (
    <nav className={styles.progress} aria-label="مراحل انجام سفر">
      <ol className={styles.progressList}>
        {stages.map((stage) => (
          <li
            key={stage.id}
            className={styles.progressItem}
            data-state={stage.state}
            aria-current={stage.state === "current" ? "step" : undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {stage.state === "complete" ? <CheckIcon size={14} /> : null}
            </span>
            <span className={styles.label}>{stage.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
