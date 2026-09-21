import { ActionLink } from "../../../components/ui/action-link/action-link";
import { ViewIcon } from "../../../components/ui/icon/icons";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "../../../components/ui/record-cards/record-cards";
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
  const isPendingHandling = status === "New";
  const actionLabel = isPendingHandling ? "رسیدگی" : "مشاهده";

  return (
    <tr>
      <td>
        <TechnicalValue>{request.requestNo}</TechnicalValue>
      </td>
      <td>
        <StatusBadge
          label={request.statusLabel}
          tone={tripRequestStatusTone(status)}
        />
      </td>
      <td>
        <div className={styles.scheduleCell}>
          <span className={styles.scheduleDay}>{schedule.travelDayLabel}</span>
          <span className={styles.scheduleTime}>{schedule.travelTimeLabel}</span>
        </div>
      </td>
      <td>
        <span className={styles.routeText}>
          {request.originSummary} ← {request.destinationSummary}
        </span>
      </td>
      <td>
        <div className={styles.typeCell}>
          <span className={styles.typeHeadline}>{purposeOrType}</span>
          {request.purpose &&
            request.purpose.trim() !== request.requestTypeName && (
              <span className={styles.typeSub}>{request.requestTypeName}</span>
            )}
        </div>
      </td>
      <td>{formatTripListPassengerCount(request.passengerCount)}</td>
      <td className={styles.actionCell}>
        <ActionLink
          href={`/trips/${request.tripRequestId}`}
          variant="secondary"
          size="sm"
        >
          <ViewIcon />
          {actionLabel}
        </ActionLink>
      </td>
    </tr>
  );
}

export type TripRequestCardItem = {
  view: TripListItemView;
  status: string;
};

export function TripRequestCard({
  request,
  status,
}: TripRequestListRowProps) {
  const schedule = formatTripListSchedule(request.plannedAt);
  const purposeOrType = tripListPurposeOrTypeLine(
    request.purpose,
    request.requestTypeName,
  );
  const isPendingHandling = status === "New";
  const actionLabel = isPendingHandling ? "رسیدگی" : "مشاهده";

  return (
    <RecordCard>
      <RecordCardHeader
        title={<TechnicalValue>{request.requestNo}</TechnicalValue>}
        badge={
          <StatusBadge
            label={request.statusLabel}
            tone={tripRequestStatusTone(status)}
          />
        }
      />
      <div className={styles.cardRoute}>
        <span className={styles.routeText}>
          {request.originSummary} ← {request.destinationSummary}
        </span>
      </div>
      <RecordCardDetails>
        <RecordCardDetail label="زمان سفر">
          <span>
            {schedule.travelDayLabel} ({schedule.travelTimeLabel})
          </span>
        </RecordCardDetail>
        <RecordCardDetail label="نوع درخواست">
          {purposeOrType}
        </RecordCardDetail>
        <RecordCardDetail label="تعداد مسافر">
          {formatTripListPassengerCount(request.passengerCount)}
        </RecordCardDetail>
      </RecordCardDetails>
      <div className={styles.cardActions}>
        <ActionLink
          href={`/trips/${request.tripRequestId}`}
          variant="secondary"
          size="sm"
        >
          <ViewIcon />
          {actionLabel}
        </ActionLink>
      </div>
    </RecordCard>
  );
}

export function TripRequestCards({
  rows,
}: {
  rows: readonly TripRequestCardItem[];
}) {
  return (
    <RecordCardList>
      {rows.map((row) => (
        <TripRequestCard
          key={row.view.tripRequestId}
          request={row.view}
          status={row.status}
        />
      ))}
    </RecordCardList>
  );
}
