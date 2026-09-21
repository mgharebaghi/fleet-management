import { BackLink } from "@/components/ui/back-link/back-link";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { formatTripDateTime } from "../../trip-format";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import styles from "../trip-workspace.module.css";
import type { TripWorkspaceView } from "../trip-workspace-view";

export function WorkspaceIdentity({
  view,
  backHref,
}: {
  view: TripWorkspaceView;
  backHref: string;
}) {
  return (
    <header className={styles.identity}>
      <div className={styles.identityTop}>
        <div className={styles.identityTitle}>
          <h1>{view.requestNo}</h1>
          <StatusBadge
            label={view.statusLabel}
            tone={tripRequestStatusTone(view.status)}
          />
        </div>
        <BackLink href={backHref} label="بازگشت به لیست" />
      </div>
      <div className={styles.summaryCards}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>مسیر</span>
          <strong>
            {view.originSummary} ← {view.destinationSummary}
          </strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>زمان سفر</span>
          <strong>{formatTripDateTime(view.plannedAt)}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>نوع درخواست</span>
          <strong>{view.requestTypeName}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>مسافران</span>
          <strong>{view.passengerCount} نفر</strong>
        </article>
      </div>
    </header>
  );
}
