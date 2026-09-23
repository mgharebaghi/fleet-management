"use client";

import { useMemo, useState, useTransition } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { BackLink } from "@/components/ui/back-link/back-link";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import { WizardProgress } from "@/components/ui/wizard-progress/wizard-progress";
import type {
  TripLocationReference,
  TripRequestDetails,
} from "../../application/trip-records";
import { formatTripDateTime } from "../trip-format";
import { tripMessages } from "../trip-form-data";
import {
  HANDLING_WIZARD_STEPS,
  type CreateWizardAssignments,
  type CreateWizardPassenger,
  type CreateWizardRoute,
  type HandlingWizardStep,
} from "../create-request/create-wizard";
import { AssignmentStep } from "../create-request/assignment-step";
import { RouteStep } from "../create-request/route-step";
import { CancelTripRequestAction } from "../workspace/cancel-trip-request-action";
import { projectTripWorkspace } from "../workspace/trip-workspace-view";
import {
  assignInitialTripRequestAction,
  type AssignInitialTripRequestPayload,
} from "../trip.actions";
import styles from "../create-request/create-trip.module.css";

export type TripRequestHandlingPageProps = {
  details: TripRequestDetails;
  locations: TripLocationReference[];
  assignmentsByPassenger: CreateWizardAssignments;
  activePassengerCountsByVehicle: Readonly<Record<number, number>>;
};

export function TripRequestHandlingPage({
  details,
  locations,
  assignmentsByPassenger,
  activePassengerCountsByVehicle,
}: TripRequestHandlingPageProps) {
  const [step, setStep] = useState<HandlingWizardStep>(1);
  const [selectedAssignments, setSelectedAssignments] = useState<
    Record<number, number>
  >({});
  const [routes, setRoutes] = useState<CreateWizardRoute[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const wizardPassengers: CreateWizardPassenger[] = useMemo(() => {
    return details.passengers.map((passenger) => {
      const pickupDate =
        passenger.requestedPickupDateTime ?? details.requestedTravelDateTime;
      return {
        key: passenger.tripId,
        personId: passenger.passenger.personId,
        personName:
          `${passenger.passenger.firstName} ${passenger.passenger.lastName}`.trim(),
        personnelNo: passenger.passenger.personnelNo,
        nationalCode: passenger.passenger.nationalCode,
        originName: passenger.origin.locationName,
        destinationName: passenger.destination.locationName,
        originLocation: passenger.origin,
        destinationLocation: passenger.destination,
        requestedPickupAt: pickupDate.toISOString(),
        requestedPickupLabel: formatTripDateTime(pickupDate),
      };
    });
  }, [details]);

  const allAssigned = wizardPassengers.every(
    (item) => selectedAssignments[item.key],
  );

  const plannedRows = useMemo(() => {
    return wizardPassengers.map((passenger) => ({
      passenger,
      assignment: (assignmentsByPassenger[passenger.key] ?? []).find(
        (item) => item.assignmentId === selectedAssignments[passenger.key],
      ),
      routes: routes.filter((route) => route.passengerKey === passenger.key),
    }));
  }, [wizardPassengers, assignmentsByPassenger, selectedAssignments, routes]);

  function handleSubmit() {
    if (!allAssigned) {
      setSubmissionError("لطفاً برای همه مسافران راننده و خودرو انتخاب کنید.");
      return;
    }
    setSubmissionError(null);
    startTransition(async () => {
      const payload: AssignInitialTripRequestPayload = {
        tripRequestId: details.tripRequestId,
        assignments: selectedAssignments,
        routes: routes.map((r) => ({
          tripId: r.passengerKey,
          routeName: r.routeName,
          alternativeNo: r.alternativeNo,
          distanceKm: r.distanceKm,
          estimatedDurationMinute: r.estimatedDurationMinute,
          isSelected: r.isSelected,
          description: r.description,
          points: r.points.map((p) => ({
            locationId: p.locationId,
            trafficZone: p.trafficZone,
            sequenceNo: p.sequenceNo,
            distanceFromStartKm: p.distanceFromStartKm,
            description: p.description,
          })),
        })),
      };

      const result = await assignInitialTripRequestAction(payload);
      if (!result.success) {
        setSubmissionError(
          tripMessages[result.error as keyof typeof tripMessages] ??
            "تخصیص اولیه انجام نشد.",
        );
      }
    });
  }

  const view = projectTripWorkspace(details);
  const cancelAction = view.canCancel ? (
    <div className={styles.handlingCancelAction}>
      <CancelTripRequestAction
        tripRequestId={details.tripRequestId}
        requestNo={details.requestNo}
        purpose={details.purpose}
        plannedAt={details.requestedTravelDateTime}
      />
    </div>
  ) : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title={`رسیدگی به درخواست ${details.requestNo}`}
        action={
          <BackLink
            href="/trips/requests"
            label="بازگشت به فهرست درخواست‌ها"
          />
        }
        compactAction
      />
      <div className={styles.createShell}>
        <div className={styles.createProgress}>
          <WizardProgress
            steps={HANDLING_WIZARD_STEPS}
            currentIndex={step - 1}
            ariaLabel="مراحل رسیدگی به درخواست سفر"
          />
        </div>

        {/* Step 1: بررسی درخواست */}
        {step === 1 && (
          <div className={styles.stepContainer}>
            <InlineNotice tone="info">
              این درخواست سفر در انتظار رسیدگی واحد ترابری است. برای فعال‌سازی سفر
              و مشخص کردن مجری، راننده و خودروی مناسب را برای مسافران تعیین کنید.
            </InlineNotice>

            <div className={styles.reviewGridSections}>
              <section className={styles.reviewCard}>
                <div className={styles.reviewCardHeader}>
                  <h3>اطلاعات درخواست</h3>
                  <StatusBadge label={details.requestType.typeName} tone="info" />
                </div>
                <dl className={styles.reviewMetaList}>
                  <div>
                    <dt>شماره درخواست</dt>
                    <dd>
                      <TechnicalValue>{details.requestNo}</TechnicalValue>
                    </dd>
                  </div>
                  <div>
                    <dt>نوع درخواست</dt>
                    <dd>{details.requestType.typeName}</dd>
                  </div>
                  <div>
                    <dt>زمان درخواست سفر</dt>
                    <dd>{formatTripDateTime(details.requestedTravelDateTime)}</dd>
                  </div>
                  <div>
                    <dt>زمان ثبت درخواست</dt>
                    <dd>{formatTripDateTime(details.requestDateTime)}</dd>
                  </div>
                  {details.purpose && (
                    <div className={styles.reviewWide}>
                      <dt>هدف سفر</dt>
                      <dd>{details.purpose}</dd>
                    </div>
                  )}
                  {details.description && (
                    <div className={styles.reviewWide}>
                      <dt>توضیحات</dt>
                      <dd>{details.description}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className={styles.reviewCard}>
                <div className={styles.reviewCardHeader}>
                  <h3>فهرست مسافران</h3>
                  <span className={styles.muted}>
                    {details.passengers.length} مسافر
                  </span>
                </div>
                <div className={styles.reviewPassengerTableWrapper}>
                  <table className={styles.reviewTable}>
                    <thead>
                      <tr>
                        <th>مسافر</th>
                        <th>شماره پرسنلی</th>
                        <th>مبدأ و مقصد</th>
                        <th>زمان سوارشدن</th>
                        <th>توضیحات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.passengers.map((p) => {
                        const pickupDate =
                          p.requestedPickupDateTime ??
                          details.requestedTravelDateTime;
                        return (
                          <tr key={p.tripId}>
                            <td data-label="مسافر">
                              <strong>
                                {p.passenger.firstName} {p.passenger.lastName}
                              </strong>
                            </td>
                            <td data-label="شماره پرسنلی">
                              {p.passenger.personnelNo ? (
                                <TechnicalValue>
                                  {p.passenger.personnelNo}
                                </TechnicalValue>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td data-label="مبدأ و مقصد">
                              {p.origin.locationName} ← {p.destination.locationName}
                            </td>
                            <td data-label="زمان سوارشدن">
                              {formatTripDateTime(pickupDate)}
                            </td>
                            <td data-label="توضیحات">{p.description ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className={styles.stepActions}>
              <FormActions>
                <ActionButton type="button" onClick={() => setStep(2)}>
                  بعدی: راننده و خودرو
                </ActionButton>
              </FormActions>
              {cancelAction}
            </div>
          </div>
        )}

        {/* Step 2: راننده و خودرو */}
        {step === 2 && (
          <AssignmentStep
            hidden={false}
            passengers={wizardPassengers}
            assignmentsByPassenger={assignmentsByPassenger}
            selectedAssignments={selectedAssignments}
            activePassengerCountsByVehicle={activePassengerCountsByVehicle}
            onSelectionChange={(passengerKey, assignmentId) => {
              setSelectedAssignments((prev) => ({
                ...prev,
                [passengerKey]: assignmentId,
              }));
            }}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            footerAction={cancelAction}
          />
        )}

        {/* Step 3: مسیر */}
        {step === 3 && (
          <RouteStep
            hidden={false}
            passengers={wizardPassengers}
            locations={locations}
            routes={routes}
            onRoutesChange={setRoutes}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="بعدی: تأیید و تخصیص"
            footerAction={cancelAction}
          />
        )}

        {/* Step 4: تأیید و تخصیص */}
        {step === 4 && (
          <div className={styles.stepContainer}>
            <div className={styles.stepHeader}>
              <div>
                <h2>تأیید و تخصیص نهایی سفر</h2>
                <p className={styles.stepDescription}>
                  برنامه و تخصیص‌های انتخاب‌شده برای مسافران را بررسی کرده و ثبت
                  نهایی را انجام دهید. پس از ثبت، پروندهٔ سفر با وضعیت «تخصیص‌یافته»
                  تشکیل می‌شود.
                </p>
              </div>
              <StatusBadge
                label={allAssigned ? "آماده تخصیص نهایی" : "نیازمند تخصیص"}
                tone={allAssigned ? "positive" : "warning"}
              />
            </div>

            {submissionError && (
              <InlineNotice tone="danger" role="alert">
                {submissionError}
              </InlineNotice>
            )}

            <section className={styles.planningSection}>
              <div className={styles.sectionHeader}>
                <h3>خلاصه برنامه و تخصیص مسافران</h3>
                <p>{wizardPassengers.length} مسافر</p>
              </div>
              <div className={styles.planningPassengerList}>
                {plannedRows.map(
                  ({ passenger, assignment, routes: passengerRoutes }) => (
                    <article
                      key={passenger.key}
                      className={styles.planningPassengerCard}
                    >
                      <div className={styles.cardHeader}>
                        <div>
                          <strong>{passenger.personName}</strong>
                          {passenger.personnelNo && (
                            <span className={styles.muted}>
                              پرسنلی:{" "}
                              <TechnicalValue>
                                {passenger.personnelNo}
                              </TechnicalValue>
                            </span>
                          )}
                          <span className={styles.passengerRouteText}>
                            {passenger.originName} ← {passenger.destinationName}
                          </span>
                        </div>
                        <StatusBadge
                          label={assignment ? "تخصیص‌یافته" : "بدون تخصیص"}
                          tone={assignment ? "positive" : "warning"}
                        />
                      </div>
                      {assignment && (
                        <div className={styles.planningAssignmentGrid}>
                          <div className={styles.detailBlock}>
                            <span className={styles.detailLabel}>راننده</span>
                            <strong>
                              {assignment.driverFirstName}{" "}
                              {assignment.driverLastName}
                            </strong>
                            {assignment.driverPersonnelNo && (
                              <span className={styles.muted}>
                                پرسنلی:{" "}
                                <TechnicalValue>
                                  {assignment.driverPersonnelNo}
                                </TechnicalValue>
                              </span>
                            )}
                          </div>
                          <div className={styles.detailBlock}>
                            <span className={styles.detailLabel}>
                              خودرو و پلاک
                            </span>
                            <div className={styles.vehicleDetailContent}>
                              <strong>
                                {assignment.vehicle.brandName}{" "}
                                {assignment.vehicle.modelName}
                              </strong>
                              <div className={styles.plateWrapper}>
                                <VehiclePlate vehicle={assignment.vehicle} />
                              </div>
                            </div>
                          </div>
                          <div className={styles.detailBlock}>
                            <span className={styles.detailLabel}>
                              مسیر برنامه‌ریزی‌شده
                            </span>
                            <span>
                              {passengerRoutes.length
                                ? passengerRoutes
                                    .map((r) => r.routeName)
                                    .join("، ")
                                : "بدون مسیر اختیاری"}
                            </span>
                          </div>
                        </div>
                      )}
                    </article>
                  ),
                )}
              </div>
            </section>

            <div className={styles.stepActions}>
              <FormActions>
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setStep(3)}
                >
                  قبلی: مسیر سفر
                </ActionButton>
                <ActionButton
                  type="button"
                  disabled={!allAssigned || pending}
                  pending={pending}
                  onClick={handleSubmit}
                >
                  {pending ? "در حال ثبت و تخصیص..." : "تأیید و تخصیص سفر"}
                </ActionButton>
              </FormActions>
              {cancelAction}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
