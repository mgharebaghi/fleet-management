"use client";

import { useState, useTransition } from "react";

import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";

import { createTripRequestAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import type { TripRequestReview } from "./create-wizard";
import { CreateWizardNavigation } from "./create-wizard-navigation";
import styles from "../trip-wizard.module.css";

type ReviewStepProps = {
  hidden: boolean;
  review: TripRequestReview;
  formValues: Record<string, string>;
  onBack: () => void;
};

export function ReviewStep({
  hidden,
  review,
  formValues,
  onBack,
}: ReviewStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTripRequestAction(formValues);
      if (!result.success) {
        setError(tripMessages[result.error as keyof typeof tripMessages] ?? "ثبت نهایی انجام نشد.");
      }
    });
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <div>
          <h2>
            مرور و تأیید درخواست سفر
          </h2>
          <p className={styles.stepDescription}>
            اطلاعات درخواست و مسافران را بررسی کنید و درخواست را ثبت نمایید.
          </p>
        </div>
        <StatusBadge
          label="آماده ثبت درخواست"
          tone="positive"
        />
      </div>

      {error && <InlineNotice tone="danger" role="alert">{error}</InlineNotice>}

      <div className={styles.reviewGridSections}>
        <section className={styles.reviewCard}>
          <div className={styles.reviewCardHeader}>
            <h3>اطلاعات درخواست</h3>
            <StatusBadge label="ثبت‌نشده" tone="info" />
          </div>
          <dl className={styles.reviewMetaList}>
            <div><dt>نوع درخواست</dt><dd>{review.requestTypeName}</dd></div>
            <div><dt>زمان درخواست سفر</dt><dd>{review.travelAt}</dd></div>
            {review.purpose && <div className={styles.reviewWide}><dt>هدف سفر</dt><dd>{review.purpose}</dd></div>}
            {review.description && <div className={styles.reviewWide}><dt>توضیحات</dt><dd>{review.description}</dd></div>}
          </dl>
        </section>

        <section className={styles.reviewCard}>
          <div className={styles.reviewCardHeader}>
            <h3>فهرست مسافران</h3>
            <span className={styles.muted}>
              {`${review.passengers.length} مسافر`}
            </span>
          </div>
          <div className={styles.reviewPassengerTableWrapper}>
            <table className={styles.reviewTable}>
                <thead>
                  <tr>
                    <th>مسافر</th>
                    <th>مبدأ و مقصد</th>
                    <th>توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {review.passengers.map((passenger, index) => (
                    <tr key={index}>
                      <td data-label="مسافر"><strong>{passenger.personName}</strong></td>
                      <td data-label="مبدأ و مقصد">{passenger.originName} ← {passenger.destinationName}</td>
                      <td data-label="توضیحات">{passenger.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </section>
      </div>

      <CreateWizardNavigation
        onBack={onBack}
        onPrimary={submit}
        primaryLabel="ثبت درخواست سفر"
        pending={pending}
        primaryDisabled={false}
      />
    </div>
  );
}
