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
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { TimeSelect } from "@/components/ui/time-select/time-select";
import type {
  TripExecutionRecord,
  TripPassengerRecord,
} from "../application/trip-records";
import { saveTripExecutionAction } from "./trip.actions";
import { tehranDateTimeInputs, tripMessages } from "./trip-form-data";
import { executionStatusLabel } from "./trip-status";
import styles from "./trip-forms.module.css";

export function TripExecutionForm({
  tripRequestId,
  trip,
  execution,
}: {
  tripRequestId: number;
  trip: TripPassengerRecord;
  execution: TripExecutionRecord;
}) {
  const started = executionHasStarted(execution);
  const targetStatus =
    execution.status === "Planned" ? "InProgress" : "Completed";
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
    <div className={styles.detailForm}>
    <form
      action={formAction}
      noValidate
      aria-label="اصلاح اجرای سفر"
      aria-busy={pending}
    >
      <h3>
        {execution.status === "Planned"
          ? `ثبت زمان حرکت — ${trip.passenger.firstName} ${trip.passenger.lastName}`
          : `ثبت بازگشت — ${trip.passenger.firstName} ${trip.passenger.lastName}`}
      </h3>
      <p className={styles.hint}>
        راننده: {execution.assignment.driverFirstName}{" "}
        {execution.assignment.driverLastName} — خودرو{" "}
        {execution.assignment.vehicle.vehicleCode}. وضعیت فعلی:{" "}
        {executionStatusLabel(execution.status)}
      </p>
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
      <input type="hidden" name="executionStatus" value={targetStatus} />
      <div className={styles.dateRows}>
        <div className={styles.dateRow}>
          <JalaliDatePicker
            name="actualPickupDay"
            label="تاریخ واقعی حرکت/سوارشدن (شمسی)"
            defaultValue={value("actualPickupDay", pickup.day)}
            disabled={pending}
          />
          <TimeSelect
            id={`${prefix}-actual-pickup-time`}
            name="actualPickupTime"
            label="ساعت واقعی حرکت"
            defaultValue={value("actualPickupTime", pickup.time)}
            disabled={pending}
          />
        </div>
        {started && (
          <div className={styles.dateRow}>
            <JalaliDatePicker
              name="actualDropoffDay"
              label="تاریخ واقعی بازگشت/پیاده‌شدن (شمسی)"
              defaultValue={value("actualDropoffDay", dropoff.day)}
              disabled={pending}
            />
            <TimeSelect
              id={`${prefix}-actual-dropoff-time`}
              name="actualDropoffTime"
              label="ساعت واقعی بازگشت"
              defaultValue={value("actualDropoffTime", dropoff.time)}
              disabled={pending}
            />
          </div>
        )}
      </div>
      <FormGrid>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-start-odometer`}>
            کیلومتر شروع (اختیاری)
          </FieldLabel>
          <input
            id={`${prefix}-start-odometer`}
            name="startOdometer"
            className={formControlClassName}
            inputMode="decimal"
            dir="ltr"
            defaultValue={value("startOdometer", execution.startOdometer ?? "")}
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
        {started && (
          <FormField>
            <FieldLabel htmlFor={`${prefix}-end-odometer`}>
              کیلومتر پایان (اختیاری)
            </FieldLabel>
            <input
              id={`${prefix}-end-odometer`}
              name="endOdometer"
              className={formControlClassName}
              inputMode="decimal"
              dir="ltr"
              defaultValue={value("endOdometer", execution.endOdometer ?? "")}
              disabled={pending}
            />
          </FormField>
        )}
      </FormGrid>
      <FormField>
        <FieldLabel htmlFor={`${prefix}-execution-description`}>
          توضیحات عملیاتی قبض برگشتی (اختیاری)
        </FieldLabel>
        <textarea
          id={`${prefix}-execution-description`}
          name="executionDescription"
          className={formControlClassName}
          rows={3}
          defaultValue={value("executionDescription", execution.description ?? "")}
          disabled={pending}
        />
      </FormField>
      <p className={styles.hint}>
        اطلاعات کاغذ برگشتی را کارکنان در این فرم ثبت می‌کنند؛ تخصیص خودرو از
        بخش «برنامه‌ریزی سفر» مدیریت می‌شود.
      </p>
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending
            ? "در حال ثبت…"
            : execution.status === "Planned"
              ? "شروع اجرا"
              : "تکمیل اجرا"}
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
