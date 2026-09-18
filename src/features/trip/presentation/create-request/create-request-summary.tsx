import type { TripRequestSummaryPreview } from "./create-wizard";
import styles from "./create-trip.module.css";

function display(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function CreateRequestSummary({
  preview,
  step,
}: {
  preview: TripRequestSummaryPreview | null;
  step: 1 | 2;
}) {
  return (
    <aside className={styles.summaryCard} aria-label="خلاصه درخواست">
      <h3>خلاصه درخواست</h3>
      <dl className={styles.summaryList}>
        <div>
          <dt>نوع درخواست</dt>
          <dd>{display(preview?.requestTypeName)}</dd>
        </div>
        <div>
          <dt>هدف سفر</dt>
          <dd>{display(preview?.purpose)}</dd>
        </div>
        <div>
          <dt>تاریخ و ساعت درخواست</dt>
          <dd>{display(preview?.requestAt)}</dd>
        </div>
        <div>
          <dt>تاریخ و ساعت پیشنهادی سفر</dt>
          <dd>{display(preview?.travelAt)}</dd>
        </div>
        <div>
          <dt>مبدأ</dt>
          <dd>{display(preview?.originName)}</dd>
        </div>
        <div>
          <dt>مقصد</dt>
          <dd>{display(preview?.destinationName)}</dd>
        </div>
        <div>
          <dt>تعداد مسافران</dt>
          <dd>
            {preview?.passengerCount
              ? `${preview.passengerCount} نفر`
              : "—"}
          </dd>
        </div>
      </dl>
      {step === 1 && (
        <p className={styles.summaryHint}>
          در مرحله بعد، اطلاعات مسافران را ثبت می‌کنید.
        </p>
      )}
    </aside>
  );
}
