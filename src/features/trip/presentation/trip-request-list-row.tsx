import { ActionLink } from "../../../components/ui/action-link/action-link";
import { StatusBadge } from "../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../components/ui/technical-value/technical-value";
import {
  formatTripListPassengerCount,
  formatTripListSchedule,
  tripListPurposeOrTypeLine,
} from "./trip-list-format";
import { tripRequestStatusTone } from "./trip-list-status-tone";
import type { TripListItemView } from "./workspace/trip-workspace-view";
import styles from "./trip-list.module.css";

export type TripRequestListRowProps = {
  request: TripListItemView;
  status: string;
};

export function TripRequestListRow({
  request,
  status,
}: TripRequestListRowProps) {
  const schedule = formatTripListSchedule(request.plannedAt);
  const purposeOrType = tripListPurposeOrTypeLine(
    request.purpose,
    request.requestTypeName,
  );

  return (
    <article className={styles.row}>
      <div className={styles.scheduleBlock}>
        <span className={styles.travelDay}>{schedule.travelDayLabel}</span>
        <span className={styles.travelTime}>{schedule.travelTimeLabel}</span>
      </div>
      <div className={styles.routeBlock}>
        <p className={styles.routeLine}>
          {request.originSummary} ← {request.destinationSummary}
        </p>
        <p className={styles.metaLine}>
          {purposeOrType}
          <span className={styles.metaSeparator} aria-hidden="true">
            •
          </span>
          {formatTripListPassengerCount(request.passengerCount)}
        </p>
      </div>
      <div className={styles.statusCell}>
        <StatusBadge
          label={request.statusLabel}
          tone={tripRequestStatusTone(status)}
        />
      </div>
      <div className={styles.idBlock}>
        <span className={styles.requestNo}>
          <TechnicalValue>{request.requestNo}</TechnicalValue>
        </span>
        <span className={styles.shortDate}>{schedule.shortDateLabel}</span>
      </div>
      <div className={styles.detailsAction}>
        <ActionLink href={`/trips/${request.tripRequestId}`} variant="secondary">
          مشاهده جزئیات
        </ActionLink>
      </div>
    </article>
  );
}
