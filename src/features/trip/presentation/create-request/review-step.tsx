"use client";

import { useState, useTransition } from "react";

import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import { createCompleteTripRequestAction, createTripRequestAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import type {
  CreateWizardAssignments,
  CreateWizardPassenger,
  CreateWizardPayload,
  TripRequestReview,
} from "./create-wizard";
import { CreateWizardNavigation } from "./create-wizard-navigation";
import styles from "./create-trip.module.css";

type ReviewStepProps = {
  hidden: boolean;
  review: TripRequestReview;
  passengers?: CreateWizardPassenger[];
  assignmentsByPassenger?: CreateWizardAssignments;
  payload?: CreateWizardPayload;
  formValues?: Record<string, string>;
  onBack: () => void;
};

export function ReviewStep({
  hidden,
  review,
  passengers = [],
  assignmentsByPassenger,
  payload,
  formValues,
  onBack,
}: ReviewStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  const isCompleteMode = Boolean(assignmentsByPassenger && payload);
  const rows = passengers.map((passenger) => ({
    passenger,
    assignment: (assignmentsByPassenger?.[passenger.key] ?? []).find(
      (item) => item.assignmentId === payload?.assignments[passenger.key],
    ),
    routes: (payload?.routes ?? []).filter((route) => route.passengerKey === passenger.key),
  }));
  const allAssigned = isCompleteMode ? rows.every((row) => row.assignment) : true;

  function submit() {
    setError(null);
    startTransition(async () => {
      if (formValues) {
        const result = await createTripRequestAction(formValues);
        if (!result.success) {
          setError(
            tripMessages[result.error as keyof typeof tripMessages] ??
              "ثبت نهایی انجام نشد.",
          );
        }
        return;
      }

      if (payload) {
        const result = await createCompleteTripRequestAction(payload);
        if (!result.success) {
          setError(
            tripMessages[result.error as keyof typeof tripMessages] ??
              "ثبت نهایی انجام نشد.",
          );
        }
      }
    });
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <div>
          <h2>
            {isCompleteMode ? "مرور و تأیید نهایی" : "مرور و تأیید درخواست سفر"}
          </h2>
          <p className={styles.stepDescription}>
            {isCompleteMode
              ? "با تأیید نهایی، درخواست و اطلاعات برنامه‌ریزی ثبت می‌شوند."
              : "اطلاعات درخواست و مسافران را بررسی کنید و درخواست را ثبت نمایید."}
          </p>
        </div>
        <StatusBadge
          label={
            isCompleteMode
              ? allAssigned
                ? "آماده ثبت نهایی"
                : "نیازمند تکمیل تخصیص"
              : "آماده ثبت درخواست"
          }
          tone={allAssigned ? "positive" : "warning"}
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
            <h3>{isCompleteMode ? "مسافران، تخصیص‌ها و مسیرها" : "فهرست مسافران"}</h3>
            <span className={styles.muted}>
              {isCompleteMode ? `${rows.length} مسافر` : `${review.passengers.length} مسافر`}
            </span>
          </div>
          <div className={styles.reviewPassengerTableWrapper}>
            {isCompleteMode ? (
              <table className={styles.reviewTable}>
                <thead>
                  <tr>
                    <th>مسافر</th>
                    <th>مبدأ و مقصد</th>
                    <th>راننده</th>
                    <th>خودرو و پلاک</th>
                    <th>مسیر اختیاری</th>
                  </tr>
                </thead>
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
            ) : (
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
            )}
          </div>
        </section>
      </div>

      <CreateWizardNavigation
        onBack={onBack}
        onPrimary={submit}
        primaryLabel={isCompleteMode ? "ثبت نهایی درخواست" : "ثبت درخواست سفر"}
        pending={pending}
        primaryDisabled={!allAssigned}
      />
    </div>
  );
}
