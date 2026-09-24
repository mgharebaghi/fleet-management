import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type { TripRequestDetails } from "../../../application/trip-records";
import { formatTripDateTime } from "../../trip-format";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import styles from "../trip-workspace.module.css";
import type { TripWorkspaceView } from "../trip-workspace-view";

export function DetailsTab({
  details,
  view,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
}) {
  return (
    <section
      id="workspace-tab-details"
      className={styles.tabPanel}
      aria-label="جزئیات سفر"
      tabIndex={-1}
    >
      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>اطلاعات درخواست</h3>
            <p>مشخصات اصلی و وضعیت مستقل درخواست سفر</p>
          </div>
        </div>
        <dl className={styles.summaryFacts}>
          <div>
            <dt>شمارهٔ درخواست</dt>
            <dd>
              <TechnicalValue>{details.requestNo}</TechnicalValue>
            </dd>
          </div>
          <div>
            <dt>نوع درخواست</dt>
            <dd>{details.requestType.typeName}</dd>
          </div>
          <div>
            <dt>وضعیت درخواست</dt>
            <dd>
              <StatusBadge
                label={view.statusLabel}
                tone={tripRequestStatusTone(view.status)}
              />
            </dd>
          </div>
          {details.purpose && (
            <div className={styles.wide}>
              <dt>هدف سفر</dt>
              <dd>{details.purpose}</dd>
            </div>
          )}
          {details.description && (
            <div className={styles.wide}>
              <dt>توضیحات درخواست</dt>
              <dd>{details.description}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>زمان‌بندی</h3>
            <p>زمان ثبت درخواست و زمان پیشنهادی انجام سفر</p>
          </div>
        </div>
        <dl className={styles.summaryFacts}>
          <div>
            <dt>زمان ثبت درخواست</dt>
            <dd>{formatTripDateTime(details.requestDateTime)}</dd>
          </div>
          <div>
            <dt>زمان پیشنهادی سفر</dt>
            <dd>{formatTripDateTime(details.requestedTravelDateTime)}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
