"use client";

import { useActionState, useId } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { JalaliDatePicker } from "@/components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { TimeSelect } from "@/components/ui/time-select/time-select";
import type { TripExecutionRecord } from "../../application/trip-records";
import {
  recordTripAccidentAction,
  recordTripViolationAction,
} from "./incident.actions";
import { incidentMessages } from "./incident-form-data";
import styles from "../trip-forms.module.css";

export function TripIncidentForms({
  tripRequestId,
  execution,
}: {
  tripRequestId: number;
  execution: TripExecutionRecord;
}) {
  const [accidentState, accidentAction, accidentPending] = useActionState(
    recordTripAccidentAction.bind(null, tripRequestId),
    {},
  );
  const [violationState, violationAction, violationPending] = useActionState(
    recordTripViolationAction.bind(null, tripRequestId),
    {},
  );
  const prefix = useId();

  return (
    <div className={styles.dateRows}>
      <form
        action={accidentAction}
        noValidate
        aria-label="ثبت تصادف برگشتی"
        className={styles.detailForm}
      >
        <h3>ثبت تصادف مرتبط با این سفر</h3>
        {accidentState.error && (
          <InlineNotice tone="danger" role="alert">
            {incidentMessages[accidentState.error]}
          </InlineNotice>
        )}
        <input
          type="hidden"
          name="vehicleAssignmentId"
          value={String(execution.assignment.assignmentId)}
        />
        <div className={styles.dateRow}>
          <JalaliDatePicker
            name="accidentDay"
            label="تاریخ تصادف (شمسی)"
            defaultValue={accidentState.values?.accidentDay ?? ""}
            disabled={accidentPending}
          />
          <TimeSelect
            id={`${prefix}-accident-time`}
            name="accidentTime"
            label="ساعت تصادف"
            defaultValue={accidentState.values?.accidentTime ?? ""}
            disabled={accidentPending}
          />
        </div>
        <FormGrid>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-accident-location`}>
              محل (متن)
            </FieldLabel>
            <input
              id={`${prefix}-accident-location`}
              name="accidentLocation"
              className={formControlClassName}
              defaultValue={accidentState.values?.accidentLocation ?? ""}
              disabled={accidentPending}
            />
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-has-injury`} required>
              جراحت
            </FieldLabel>
            <select
              id={`${prefix}-has-injury`}
              name="hasInjury"
              className={formControlClassName}
              defaultValue={accidentState.values?.hasInjury ?? ""}
              disabled={accidentPending}
              required
            >
              <option value="">انتخاب کنید</option>
              <option value="false">خیر</option>
              <option value="true">بله</option>
            </select>
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-damage`}>خسارت (اختیاری)</FieldLabel>
            <input
              id={`${prefix}-damage`}
              name="damageAmount"
              className={formControlClassName}
              dir="ltr"
              inputMode="decimal"
              defaultValue={accidentState.values?.damageAmount ?? ""}
              disabled={accidentPending}
            />
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-fault`}>
              درصد تقصیر راننده (اختیاری)
            </FieldLabel>
            <input
              id={`${prefix}-fault`}
              name="driverFaultPercent"
              className={formControlClassName}
              dir="ltr"
              inputMode="decimal"
              defaultValue={accidentState.values?.driverFaultPercent ?? ""}
              disabled={accidentPending}
            />
          </FormField>
        </FormGrid>
        <FormActions separated>
          <ActionButton
            type="submit"
            disabled={accidentPending}
            pending={accidentPending}
          >
            {accidentPending ? "در حال ثبت…" : "ثبت تصادف"}
          </ActionButton>
        </FormActions>
      </form>

      <form
        action={violationAction}
        noValidate
        aria-label="ثبت تخلف برگشتی"
        className={styles.detailForm}
      >
        <h3>ثبت تخلف مرتبط با این سفر</h3>
        <p className={styles.hint}>
          اگر مبلغ مشخص نیست این رخداد را فقط روی برگه نگه دارید؛ مبلغ صفر ساخته
          نمی‌شود.
        </p>
        {violationState.error && (
          <InlineNotice tone="danger" role="alert">
            {incidentMessages[violationState.error]}
          </InlineNotice>
        )}
        <input
          type="hidden"
          name="vehicleAssignmentId"
          value={String(execution.assignment.assignmentId)}
        />
        <div className={styles.dateRow}>
          <JalaliDatePicker
            name="violationDay"
            label="تاریخ تخلف (شمسی)"
            defaultValue={violationState.values?.violationDay ?? ""}
            disabled={violationPending}
          />
          <TimeSelect
            id={`${prefix}-violation-time`}
            name="violationTime"
            label="ساعت تخلف"
            defaultValue={violationState.values?.violationTime ?? ""}
            disabled={violationPending}
          />
        </div>
        <FormGrid>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-violation-type`} required>
              نوع تخلف
            </FieldLabel>
            <input
              id={`${prefix}-violation-type`}
              name="violationType"
              className={formControlClassName}
              defaultValue={violationState.values?.violationType ?? ""}
              disabled={violationPending}
              required
            />
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-amount`} required>
              مبلغ
            </FieldLabel>
            <input
              id={`${prefix}-amount`}
              name="violationAmount"
              className={formControlClassName}
              dir="ltr"
              inputMode="decimal"
              defaultValue={violationState.values?.violationAmount ?? ""}
              disabled={violationPending}
              required
            />
          </FormField>
        </FormGrid>
        <FormActions separated>
          <ActionButton
            type="submit"
            disabled={violationPending}
            pending={violationPending}
          >
            {violationPending ? "در حال ثبت…" : "ثبت تخلف"}
          </ActionButton>
        </FormActions>
      </form>
    </div>
  );
}
