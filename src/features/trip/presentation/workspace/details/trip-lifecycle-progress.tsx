import { CheckIcon } from "@/components/ui/icon/icons";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import styles from "../trip-workspace.module.css";
import { buildTripLifecycleVisualModel } from "../trip-workspace-view";

export function TripLifecycleProgressSection({
  status,
}: {
  status: string;
}) {
  const model = buildTripLifecycleVisualModel(status);

  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>وضعیت پیشرفت سفر</h3>
          <p>مراحل کلی چرخه عمر سفر و وضعیت جاری درخواست</p>
        </div>
      </div>

      {model.isCancelled ? (
        <div className={styles.lifecycleCancelled}>
          <StatusBadge label={model.statusLabel} tone="negative" />
          <p className={styles.lifecycleCancelledNote}>
            {model.description}
          </p>
        </div>
      ) : (
        <ol
          className={styles.lifecycleTimeline}
          aria-label="مراحل چرخه عمر سفر"
        >
          {(() => {
            const currentStageIndex = model.stages.findIndex((s) => s.isCurrent);

            return model.stages.map((stage, index) => {
              const isTerminalCompleted =
                stage.id === "completion" && stage.isComplete;
              const state = stage.isCurrent
                ? "current"
                : stage.isComplete
                  ? "complete"
                  : "upcoming";
              const isConnectorBeforeComplete =
                index <= currentStageIndex && currentStageIndex > 0;
              const isConnectorAfterComplete =
                index + 1 <= currentStageIndex;

              return (
                <li
                  key={stage.id}
                  className={styles.lifecycleItem}
                  data-stage={stage.id}
                  data-state={state}
                  data-terminal={isTerminalCompleted ? "true" : undefined}
                  aria-current={stage.isCurrent ? "step" : undefined}
                >
                  <div
                    className={styles.lifecycleMarkerTrack}
                    data-next-complete={isConnectorAfterComplete ? "true" : undefined}
                  >
                    {index > 0 && (
                      <span
                        className={`${styles.lifecycleRail} ${styles.lifecycleRailStart}`}
                        data-state={
                          isConnectorBeforeComplete ? "complete" : "upcoming"
                        }
                        aria-hidden="true"
                      />
                    )}
                    {index < model.stages.length - 1 && (
                      <span
                        className={`${styles.lifecycleRail} ${styles.lifecycleRailEnd}`}
                        data-state={
                          isConnectorAfterComplete ? "complete" : "upcoming"
                        }
                        aria-hidden="true"
                      />
                    )}
                    <span className={styles.lifecycleMarker} aria-hidden="true">
                      {stage.isComplete ? (
                        <CheckIcon size={isTerminalCompleted ? 14 : 12} />
                      ) : stage.isCurrent ? (
                        <span className={styles.lifecycleCurrentDot} />
                      ) : null}
                    </span>
                  </div>
                  <div className={styles.lifecycleContent}>
                    <span className={styles.lifecycleLabel}>{stage.label}</span>
                    {stage.isCurrent && (
                      <span
                        className={styles.lifecycleCurrentBadge}
                        data-tone={isTerminalCompleted ? "positive" : "info"}
                      >
                        {isTerminalCompleted ? "تکمیل‌شده" : "مرحله فعلی"}
                      </span>
                    )}
                  </div>
                </li>
              );
            });
          })()}
        </ol>
      )}
    </section>
  );
}
