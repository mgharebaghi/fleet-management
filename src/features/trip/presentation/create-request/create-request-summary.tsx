import type { TripRequestSummaryPreview } from "./create-wizard";
import styles from "./create-trip.module.css";

export function CreateRequestSummary({
  preview,
  passengerCount,
}: {
  preview: TripRequestSummaryPreview | null;
  passengerCount: number;
}) {
  if (!preview) return null;

  const route =
    preview.originName && preview.destinationName
      ? `${preview.originName} ← ${preview.destinationName}`
      : null;
  return (
    <aside className={styles.summaryStrip} aria-label="خلاصه درخواست">
      <dl className={styles.summaryItems}>
        {preview.requestTypeName && (
          <div className={styles.summaryItem}>
            <dt>نوع درخواست</dt>
            <dd>{preview.requestTypeName}</dd>
          </div>
        )}
        {preview.travelAt && (
          <div className={styles.summaryItem}>
            <dt>زمان درخواست سفر</dt>
            <dd>{preview.travelAt}</dd>
          </div>
        )}
        {route && (
          <div className={styles.summaryItem}>
            <dt>مسیر</dt>
            <dd>{route}</dd>
          </div>
        )}
        <div className={styles.summaryItem}>
          <dt>تعداد مسافران</dt>
          <dd>{passengerCount} نفر</dd>
        </div>
      </dl>
    </aside>
  );
}
