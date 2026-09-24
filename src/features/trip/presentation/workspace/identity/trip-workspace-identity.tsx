import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { formatTripDateTime } from "../../trip-format";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import styles from "../trip-workspace.module.css";
import { buildTripLifecycleVisualModel } from "../trip-workspace-view";
import type { TripWorkspaceView } from "../trip-workspace-view";

const STAGE_LABELS = {
  request: "ثبت درخواست",
  assignment: "تخصیص",
  execution: "اجرای سفر",
  completion: "تکمیل",
} as const;

export function WorkspaceIdentity({
  view,
  backHref,
}: {
  view: TripWorkspaceView;
  backHref: string;
}) {
  const progress = buildTripLifecycleVisualModel(view.status);
  const passengerCount = new Intl.NumberFormat("fa-IR").format(view.passengerCount);

  return (
    <div className={styles.identity}>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadCopy}>
          <p className={styles.pageKicker}>سفرها</p>
          <h1>درخواست {view.requestNo}</h1>
          <p className={styles.pageSubtitle}>
            ثبت‌شده در {formatTripDateTime(view.requestAt)}
          </p>
        </div>
        <Link className={styles.queueLink} href={backHref}>
          بازگشت به صف
        </Link>
      </header>

      <section className={styles.summaryPanel}>
        <div className={styles.detailTop}>
          <div className={styles.detailTitle}>
            <span className={styles.routeMark} aria-hidden="true">
              ↗
            </span>
            <div>
            <h2>
              {view.originSummary} ← {view.destinationSummary}
            </h2>
            <small>
              {passengerCount} مسافر · {formatTripDateTime(view.plannedAt)}
            </small>
            </div>
          </div>
          <StatusBadge
            label={view.statusLabel}
            tone={tripRequestStatusTone(view.status)}
          />
        </div>
        {progress.isCancelled ? (
          <p className={styles.stageCancelled} aria-label="وضعیت پیشرفت سفر">
            لغوشده
          </p>
        ) : (
          <ol className={styles.stageRow} aria-label="وضعیت پیشرفت سفر">
            {progress.stages.map((stage, index) => {
              const state = stage.isCurrent
                ? "current"
                : stage.isComplete
                  ? "complete"
                  : "upcoming";
              const terminal =
                stage.id === "completion" && stage.isCurrent && stage.isComplete;
              return (
                <li key={stage.id} className={styles.stageItem}>
                  {index > 0 && (
                    <span className={styles.stageArrow} aria-hidden="true">
                      ←
                    </span>
                  )}
                  <span
                    className={styles.stage}
                    data-stage={stage.id}
                    data-state={state}
                    data-terminal={terminal ? "true" : undefined}
                    aria-current={stage.isCurrent ? "step" : undefined}
                  >
                    {STAGE_LABELS[stage.id]}
                    {stage.isCurrent && !terminal && (
                      <span className={styles.stageCurrentText}>مرحله فعلی</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
