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
import type { TripExecutionRecord } from "../application/trip-records";
import { savePassengerSurveyAction } from "./trip.actions";
import { tehranDateTimeInputs, tripMessages } from "./trip-form-data";
import styles from "./trip-forms.module.css";

export function PassengerSurveyForm({
  tripRequestId,
  execution,
}: {
  tripRequestId: number;
  execution: TripExecutionRecord;
}) {
  const [state, formAction, pending] = useActionState(
    savePassengerSurveyAction.bind(
      null,
      tripRequestId,
      execution.tripExecutionId,
    ),
    {},
  );
  const prefix = useId();
  const survey = tehranDateTimeInputs(execution.surveyDateTime);
  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;

  return (
    <form
      action={formAction}
      noValidate
      aria-label="ثبت نظرسنجی مسافر"
      aria-busy={pending}
      className={styles.detailForm}
    >
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <FormGrid>
        <FormField>
          <FieldLabel htmlFor={`${prefix}-rating`}>امتیاز مسافر</FieldLabel>
          <input
            id={`${prefix}-rating`}
            name="passengerRating"
            className={formControlClassName}
            inputMode="numeric"
            dir="ltr"
            defaultValue={value(
              "passengerRating",
              execution.passengerRating?.toString() ?? "",
            )}
            disabled={pending}
          />
        </FormField>
      </FormGrid>
      <div className={styles.dateRow}>
        <JalaliDatePicker
          name="surveyDay"
          label="تاریخ نظرسنجی (شمسی)"
          defaultValue={value("surveyDay", survey.day)}
          disabled={pending}
        />
        <TimeSelect
          id={`${prefix}-survey-time`}
          name="surveyTime"
          label="ساعت نظرسنجی (تهران)"
          defaultValue={value("surveyTime", survey.time)}
          disabled={pending}
        />
      </div>
      <FormField>
        <FieldLabel htmlFor={`${prefix}-comment`}>نظر مسافر</FieldLabel>
        <textarea
          id={`${prefix}-comment`}
          name="passengerComment"
          className={formControlClassName}
          rows={3}
          defaultValue={value(
            "passengerComment",
            execution.passengerComment ?? "",
          )}
          disabled={pending}
        />
      </FormField>
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending ? "در حال ثبت…" : "ذخیره نظرسنجی"}
        </ActionButton>
      </FormActions>
    </form>
  );
}
