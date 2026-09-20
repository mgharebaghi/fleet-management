"use client";

import { useState, useTransition } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import { createCompleteTripRequestAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import type {
  CreateWizardAssignments,
  CreateWizardPassenger,
  CreateWizardPayload,
  TripRequestReview,
} from "./create-wizard";
import styles from "./create-trip.module.css";

type ReviewStepProps = {
  hidden: boolean;
  review: TripRequestReview;
  passengers: CreateWizardPassenger[];
  assignmentsByPassenger: CreateWizardAssignments;
  payload: CreateWizardPayload;
  onBack: () => void;
};

export function ReviewStep({
  hidden,
  review,
  passengers,
  assignmentsByPassenger,
  payload,
  onBack,
}: ReviewStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  const rows = passengers.map((passenger) => ({
    passenger,
    assignment: (assignmentsByPassenger[passenger.key] ?? []).find(
      (item) => item.assignmentId === payload.assignments[passenger.key],
    ),
    routes: payload.routes.filter((route) => route.passengerKey === passenger.key),
  }));
  const allAssigned = rows.every((row) => row.assignment);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createCompleteTripRequestAction(payload);
      if (!result.success) {
        setError(tripMessages[result.error as keyof typeof tripMessages] ?? "ثبت نهایی انجام نشد.");
      }
    });
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <div>
          <h2>مرور و تأیید نهایی</h2>
          <p className={styles.stepDescription}>با تأیید نهایی، درخواست و اطلاعات برنامه‌ریزی ثبت می‌شوند.</p>
        </div>
        <StatusBadge label={allAssigned ? "آماده ثبت نهایی" : "نیازمند تکمیل تخصیص"} tone={allAssigned ? "positive" : "warning"} />
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
          <div className={styles.reviewCardHeader}><h3>مسافران، تخصیص‌ها و مسیرها</h3><span className={styles.muted}>{rows.length} مسافر</span></div>
          <div className={styles.reviewPassengerTableWrapper}>
            <table className={styles.reviewTable}>
              <thead><tr><th>مسافر</th><th>مبدأ و مقصد</th><th>راننده</th><th>خودرو و پلاک</th><th>مسیر اختیاری</th></tr></thead>
              <tbody>
                {rows.map(({ passenger, assignment, routes }) => (
                  <tr key={passenger.key}>
                    <td data-label="مسافر"><strong>{passenger.personName}</strong></td>
                    <td data-label="مبدأ و مقصد">{passenger.originName} ← {passenger.destinationName}</td>
                    <td data-label="راننده">{assignment ? `${assignment.driverFirstName} ${assignment.driverLastName}` : "بدون راننده"}</td>
                    <td data-label="خودرو و پلاک">{assignment ? <div className={styles.vehicleReviewCell}><span>{assignment.vehicle.brandName} {assignment.vehicle.modelName}</span><div className={styles.plateWrapper}><VehiclePlate vehicle={assignment.vehicle} /></div></div> : "بدون خودرو"}</td>
                    <td data-label="مسیر اختیاری">{routes.length ? routes.map((route) => `${route.routeName} (${route.points.length} نقطه)`).join("، ") : "بدون مسیر اختیاری"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className={styles.stepActions}>
        <FormActions>
          <ActionButton type="button" variant="secondary" disabled={pending} onClick={onBack}>قبلی: برنامه‌ریزی</ActionButton>
          <ActionButton type="button" disabled={pending || !allAssigned} pending={pending} onClick={submit}>ثبت نهایی درخواست</ActionButton>
        </FormActions>
      </div>
    </div>
  );
}
