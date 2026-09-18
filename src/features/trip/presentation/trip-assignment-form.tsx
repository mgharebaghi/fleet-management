"use client";

import { useActionState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ActionLink } from "@/components/ui/action-link/action-link";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import {
  assignmentIneligibilityReasons,
  isAssignmentEligible,
} from "../application/trip-assignment-eligibility";
import type {
  TripAssignmentReference,
  TripExecutionRecord,
  TripPassengerRecord,
} from "../application/trip-records";
import { saveTripExecutionAction } from "./trip.actions";
import {
  assignmentIneligibilityMessages,
  tripMessages,
} from "./trip-form-data";
import styles from "./trip-forms.module.css";
import pageStyles from "./trip-pages.module.css";

function assignmentLabel(assignment: TripAssignmentReference) {
  return `${assignment.driverFirstName} ${assignment.driverLastName} — ${assignment.vehicle.brandName} ${assignment.vehicle.modelName} — ${assignment.vehicle.vehicleCode}`;
}

export function TripAssignmentPlanner({
  tripRequestId,
  trip,
  assignments,
  scheduledDateTime,
  execution,
  requestIsTerminal,
}: {
  tripRequestId: number;
  trip: TripPassengerRecord;
  assignments: TripAssignmentReference[];
  scheduledDateTime: Date;
  execution: TripExecutionRecord | null;
  requestIsTerminal: boolean;
}) {
  const started = Boolean(
    execution &&
      (execution.actualPickupDateTime !== null ||
        execution.status === "InProgress" ||
        execution.status === "Completed"),
  );
  const canPlan =
    !requestIsTerminal &&
    (!execution || (execution.status === "Planned" && !started));
  const action = saveTripExecutionAction.bind(
    null,
    tripRequestId,
    trip.tripId,
    execution?.status === "Planned" ? execution.tripExecutionId : null,
  );
  const [state, formAction, pending] = useActionState(action, {});
  const eligible = assignments.filter((assignment) =>
    isAssignmentEligible(assignment, scheduledDateTime),
  );
  const ineligible = assignments.filter(
    (assignment) => !isAssignmentEligible(assignment, scheduledDateTime),
  );
  const options = eligible.map((assignment) => ({
    value: String(assignment.assignmentId),
    label: assignmentLabel(assignment),
    searchText: `${assignmentLabel(assignment)} ${assignment.driverPersonnelNo ?? ""}`,
    content: <span>{assignmentLabel(assignment)}</span>,
  }));
  const persisted = execution?.assignment ?? null;

  return (
    <section className={pageStyles.stack}>
      <h3>
        {trip.passenger.firstName} {trip.passenger.lastName}
      </h3>
      {persisted && (
        <article className={pageStyles.entityCard}>
          <div className={pageStyles.entityHeader}>
            <h3>
              {persisted.driverFirstName} {persisted.driverLastName}
            </h3>
            <StatusBadge label="تخصیص ثبت‌شده" tone="positive" />
          </div>
          <div className={pageStyles.assignmentMeta}>
            <span>
              {persisted.vehicle.brandName} {persisted.vehicle.modelName}
            </span>
            <VehiclePlate vehicle={persisted.vehicle} />
            <span>
              کد خودرو:{" "}
              <TechnicalValue>{persisted.vehicle.vehicleCode}</TechnicalValue>
            </span>
          </div>
          {execution && execution.status !== "Cancelled" && (
            <div className={pageStyles.entityActions}>
              <ActionLink
                href={`/trips/${tripRequestId}/voucher/${trip.tripId}`}
                variant="primary"
              >
                صدور برگه مأموریت
              </ActionLink>
            </div>
          )}
        </article>
      )}

      {canPlan ? (
        <form
          action={formAction}
          noValidate
          aria-label="ثبت برنامهٔ اجرا"
          className={styles.detailForm}
        >
          {state.error && (
            <InlineNotice tone="danger" role="alert">
              {tripMessages[state.error]}
            </InlineNotice>
          )}
          <input type="hidden" name="executionStatus" value="Planned" />
          <SearchableSelect
            name="assignmentId"
            label="تخصیص خودرو و راننده"
            options={options}
            defaultValue={
              state.values?.assignmentId ??
              (persisted ? String(persisted.assignmentId) : "")
            }
            placeholder="انتخاب تخصیص واجد شرایط"
            searchPlaceholder="جستجوی راننده یا خودرو…"
            required
            disabled={pending || options.length === 0}
          />
          {ineligible.length > 0 && (
            <div>
              <p className={styles.hint}>تخصیص‌های غیرواجد شرایط</p>
              <ul className={styles.ineligibleList}>
                {ineligible.map((assignment) => (
                  <li key={assignment.assignmentId}>
                    {assignmentLabel(assignment)} —{" "}
                    {assignmentIneligibilityReasons(
                      assignment,
                      scheduledDateTime,
                    )
                      .map((reason) => assignmentIneligibilityMessages[reason])
                      .join("، ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className={styles.hint}>
            این انتخاب به‌صورت برنامهٔ سفر ذخیره می‌شود. برگهٔ مأموریت فقط از
            همین تخصیص ثبت‌شده صادر می‌شود.
          </p>
          <FormActions separated>
            <ActionButton
              type="submit"
              disabled={pending || options.length === 0}
              pending={pending}
            >
              {pending
                ? "در حال ثبت…"
                : persisted
                  ? "به‌روزرسانی تخصیص"
                  : "ثبت برنامهٔ اجرا"}
            </ActionButton>
          </FormActions>
        </form>
      ) : (
        <p className={styles.hint}>
          {requestIsTerminal
            ? "پس از تکمیل یا لغو درخواست، تخصیص تغییر نمی‌کند."
            : "پس از شروع واقعی سفر، تخصیص خودرو و راننده ثابت می‌ماند."}
        </p>
      )}
    </section>
  );
}
