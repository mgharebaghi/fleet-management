"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { JalaliDatePicker } from "@/components/ui/date-picker/jalali-date-picker";
import {
  FieldErrors,
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TimeSelect } from "@/components/ui/time-select/time-select";
import type {
  TripExecutionRecord,
  TripPassengerRecord,
} from "../../application/trip-records";
import { saveTripExecutionAction } from "../trip.actions";
import { formatTripDateTime } from "../trip-format";
import { tehranDateTimeInputs, tripMessages } from "../trip-form-data";
import { executionStatusLabel } from "../trip-status";
import styles from "../trip-forms.module.css";

function executionStatusTone(
  status: string,
): "positive" | "negative" | "warning" | "info" {
  switch (status) {
    case "Completed":
      return "positive";
    case "Cancelled":
      return "negative";
    case "InProgress":
      return "info";
    default:
      return "warning";
  }
}

export function TripExecutionForm({
  tripRequestId,
  trip,
  execution,
  onCancel,
}: {
  tripRequestId: number;
  trip: TripPassengerRecord;
  execution: TripExecutionRecord;
  onCancel?: () => void;
}) {
  const started = executionHasStarted(execution);
  const isCompleted = execution.status === "Completed";
  const defaultStatus = isCompleted
    ? "Completed"
    : execution.actualDropoffDateTime
      ? "Completed"
      : "InProgress";

  const action = saveTripExecutionAction.bind(
    null,
    tripRequestId,
    trip.tripId,
    execution.tripExecutionId,
  );
  const [state, formAction, pending] = useActionState(action, {});
  const prefix = useId();
  const [cancelOpen, setCancelOpen] = useState(false);
  const pickup = tehranDateTimeInputs(execution.actualPickupDateTime);
  const dropoff = tehranDateTimeInputs(execution.actualDropoffDateTime);
  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;
  const fieldInvalid = (name: string) => state.field === name;

  return (
    <div className={styles.executionForm}>
      <div className={styles.executionContextBar}>
        <div className={styles.executionContextFacts}>
          <span className={styles.executionContextFact}>
            <span>مسافر:</span>
            <strong>
              {trip.passenger.firstName} {trip.passenger.lastName}
            </strong>
            {trip.passenger.personnelNo && (
              <span>({trip.passenger.personnelNo})</span>
            )}
          </span>
          <span className={styles.executionContextFact}>
            <span>راننده:</span>
            <strong>
              {execution.assignment.driverFirstName}{" "}
              {execution.assignment.driverLastName}
            </strong>
          </span>
          <span className={styles.executionContextFact}>
            <span>خودرو:</span>
            <strong>کد {execution.assignment.vehicle.vehicleCode}</strong>
          </span>
        </div>
        <StatusBadge
          label={executionStatusLabel(execution.status)}
          tone={executionStatusTone(execution.status)}
        />
      </div>

      <form
        action={formAction}
        noValidate
        aria-label={
          isCompleted
            ? "ویرایش اطلاعات اجرای مسافر"
            : "ثبت اطلاعات اجرای مسافر"
        }
        className={styles.executionForm}
        aria-busy={pending}
      >
        {state.error && (
          <InlineNotice tone="danger" role="alert">
            {tripMessages[state.error]}
          </InlineNotice>
        )}
        <input
          type="hidden"
          name="assignmentId"
          value={String(execution.assignment.assignmentId)}
        />

        {/* Group 1: سوارشدن مسافر */}
        <fieldset className={styles.executionGroup}>
          <legend className={styles.executionGroupLegend}>سوارشدن مسافر</legend>
          {trip.requestedPickupDateTime && (
            <p className={styles.executionHelp}>
              زمان برنامه‌ریزی‌شدهٔ سوارشدن:{" "}
              {formatTripDateTime(trip.requestedPickupDateTime)}
            </p>
          )}
          <div className={styles.executionGrid2Col}>
            <JalaliDatePicker
              name="actualPickupDay"
              label="تاریخ واقعی سوارشدن"
              defaultValue={value("actualPickupDay", pickup.day)}
              disabled={pending}
            />
            <TimeSelect
              id={`${prefix}-actual-pickup-time`}
              name="actualPickupTime"
              label="ساعت واقعی سوارشدن"
              defaultValue={value("actualPickupTime", pickup.time)}
              disabled={pending}
            />
          </div>
        </fieldset>

        {/* Group 2: پیاده‌شدن مسافر */}
        <fieldset className={styles.executionGroup}>
          <legend className={styles.executionGroupLegend}>پیاده‌شدن مسافر</legend>
          <div className={styles.executionGrid2Col}>
            <JalaliDatePicker
              name="actualDropoffDay"
              label="تاریخ واقعی پیاده‌شدن"
              defaultValue={value("actualDropoffDay", dropoff.day)}
              disabled={pending}
            />
            <TimeSelect
              id={`${prefix}-actual-dropoff-time`}
              name="actualDropoffTime"
              label="ساعت واقعی پیاده‌شدن"
              defaultValue={value("actualDropoffTime", dropoff.time)}
              disabled={pending}
            />
          </div>
        </fieldset>

        {/* Group 3: کیلومترشمار */}
        <fieldset className={styles.executionGroup}>
          <legend className={styles.executionGroupLegend}>کیلومترشمار</legend>
          <div className={styles.executionGrid2Col}>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-start-odometer`}>
                کیلومتر خودرو در شروع اجرا
              </FieldLabel>
              <input
                id={`${prefix}-start-odometer`}
                name="startOdometer"
                className={formControlClassName}
                inputMode="decimal"
                dir="ltr"
                defaultValue={value(
                  "startOdometer",
                  execution.startOdometer ?? "",
                )}
                disabled={pending}
                aria-invalid={fieldInvalid("startOdometer")}
              />
              {fieldInvalid("startOdometer") && state.error && (
                <FieldErrors
                  id={`${prefix}-start-error`}
                  messages={[tripMessages[state.error]]}
                />
              )}
            </FormField>

            <FormField>
              <FieldLabel htmlFor={`${prefix}-end-odometer`}>
                کیلومتر خودرو در پایان اجرا
              </FieldLabel>
              <input
                id={`${prefix}-end-odometer`}
                name="endOdometer"
                className={formControlClassName}
                inputMode="decimal"
                dir="ltr"
                defaultValue={value("endOdometer", execution.endOdometer ?? "")}
                disabled={pending}
                aria-invalid={fieldInvalid("endOdometer")}
              />
              {fieldInvalid("endOdometer") && state.error && (
                <FieldErrors
                  id={`${prefix}-end-error`}
                  messages={[tripMessages[state.error]]}
                />
              )}
            </FormField>
          </div>
        </fieldset>

        {/* Group 4: وضعیت و توضیحات */}
        <fieldset className={styles.executionGroup}>
          <legend className={styles.executionGroupLegend}>
            وضعیت و توضیحات
          </legend>
          <div className={styles.executionGrid2Col}>
            <FormField className={styles.executionFieldHalf}>
              <FieldLabel htmlFor={`${prefix}-execution-status`}>
                وضعیت اجرای مسافر
              </FieldLabel>
              <select
                id={`${prefix}-execution-status`}
                name="executionStatus"
                className={formControlClassName}
                defaultValue={value("executionStatus", defaultStatus)}
                disabled={pending}
              >
                <option value="InProgress">در حال اجرا</option>
                <option value="Completed">تکمیل‌شده</option>
              </select>
            </FormField>

            <FormField className={styles.executionFieldFull}>
              <FieldLabel htmlFor={`${prefix}-execution-description`}>
                توضیحات عملیاتی قبض برگشتی
              </FieldLabel>
              <textarea
                id={`${prefix}-execution-description`}
                name="executionDescription"
                className={formControlClassName}
                rows={3}
                defaultValue={value(
                  "executionDescription",
                  execution.description ?? "",
                )}
                disabled={pending}
              />
            </FormField>
          </div>
        </fieldset>

        <p className={styles.executionHint}>
          اطلاعات کاغذ برگشتی را کارکنان در این فرم ثبت می‌کنند؛ تخصیص خودرو از
          بخش «برنامه‌ریزی سفر» مدیریت می‌شود.
        </p>

        <FormActions separated>
          <ActionButton type="submit" disabled={pending} pending={pending}>
            {pending
              ? "در حال ثبت…"
              : isCompleted
                ? "ذخیره اصلاحات"
                : "ثبت و ذخیره اطلاعات"}
          </ActionButton>
          {execution.status === "Planned" && !started && (
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setCancelOpen(true)}
            >
              لغو برنامه
            </ActionButton>
          )}
          {onCancel && (
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onCancel}
            >
              انصراف
            </ActionButton>
          )}
        </FormActions>
      </form>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        titleId={`${prefix}-cancel-execution`}
        title="لغو برنامهٔ سفر"
        tone="danger"
        recordName={`${trip.passenger.firstName} ${trip.passenger.lastName}`}
        message="فقط برنامهٔ شروع‌نشده لغو می‌شود. پس از آن می‌توان تخصیص جدیدی ثبت کرد."
      >
        <form action={formAction}>
          <input
            type="hidden"
            name="assignmentId"
            value={String(execution.assignment.assignmentId)}
          />
          <input type="hidden" name="executionStatus" value="Cancelled" />
          <FormActions separated>
            <ActionButton type="submit" disabled={pending} pending={pending}>
              تأیید لغو برنامه
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setCancelOpen(false)}
            >
              انصراف
            </ActionButton>
          </FormActions>
        </form>
      </ConfirmDialog>
    </div>
  );
}

function executionHasStarted(execution: TripExecutionRecord) {
  return (
    execution.actualPickupDateTime !== null ||
    execution.status === "InProgress" ||
    execution.status === "Completed"
  );
}
