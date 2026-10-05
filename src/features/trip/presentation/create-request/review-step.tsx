"use client";

import { useState, useTransition } from "react";

import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { FormSection } from "../../../../components/ui/form-field/form-field";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import {
  RecordCardList,
  RecordCard,
  RecordCardHeader,
  RecordCardDetails,
  RecordCardDetail,
} from "../../../../components/ui/record-cards/record-cards";

import { createTripRequestAction, type CreateTripRequestResult } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import type { TripRequestReview } from "./create-wizard";
import { CreateWizardNavigation } from "./create-wizard-navigation";
import styles from "../trip-wizard.module.css";

type ReviewStepProps = {
  hidden: boolean;
  review: TripRequestReview;
  formValues: Record<string, string>;
  onBack: () => void;
  onFailure?: (result: Extract<CreateTripRequestResult, { success: false }>) => void;
};

export function ReviewStep({
  hidden,
  review,
  formValues,
  onBack,
  onFailure,
}: ReviewStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createTripRequestAction(formValues);
      if (!result.success) {
        if (onFailure && (result.field || result.failedLocation)) {
          onFailure(result);
          return;
        }
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
        <FormSection title="اطلاعات درخواست" aside={<StatusBadge label="ثبت‌نشده" tone="info" />}>
          <dl className={styles.reviewMetaList}>
            <div><dt>نوع درخواست</dt><dd>{review.requestTypeName}</dd></div>
            <div><dt>زمان درخواست سفر</dt><dd>{review.travelAt}</dd></div>
            {review.purpose && <div><dt>هدف سفر</dt><dd>{review.purpose}</dd></div>}
            {review.description && <div className={styles.reviewWide}><dt>توضیحات</dt><dd>{review.description}</dd></div>}
          </dl>
        </FormSection>

        <FormSection
          title="فهرست مسافران"
          aside={<span className={styles.muted}>{`${review.passengers.length.toLocaleString("fa-IR")} مسافر`}</span>}
        >
          <DataTable caption="فهرست مسافران درخواست سفر">
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
                  <td><strong>{passenger.personName}</strong></td>
                  <td>{passenger.originName} ← {passenger.destinationName}</td>
                  <td>{passenger.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <RecordCardList>
            {review.passengers.map((passenger, index) => (
              <RecordCard key={index}>
                <RecordCardHeader title={passenger.personName} />
                <RecordCardDetails>
                  <RecordCardDetail label="مبدأ و مقصد">{passenger.originName} ← {passenger.destinationName}</RecordCardDetail>
                  <RecordCardDetail label="توضیحات">{passenger.description ?? "—"}</RecordCardDetail>
                </RecordCardDetails>
              </RecordCard>
            ))}
          </RecordCardList>
        </FormSection>
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
