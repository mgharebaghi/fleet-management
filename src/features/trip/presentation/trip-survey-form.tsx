"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type { TripExecutionRecord } from "../application/trip-records";
import { savePassengerSurveyAction } from "./trip.actions";
import { tripMessages } from "./trip-form-data";
import styles from "./trip-forms.module.css";

export { TripSurveyButton, TripSurveyDialog } from "./trip-survey-dialog";

const RATING_OPTIONS = [
  { value: 1, label: "خیلی ضعیف", number: "۱" },
  { value: 2, label: "ضعیف", number: "۲" },
  { value: 3, label: "متوسط", number: "۳" },
  { value: 4, label: "خوب", number: "۴" },
  { value: 5, label: "عالی", number: "۵" },
];

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
  const value = (name: string, fallback = "") =>
    state.values?.[name] ?? fallback;

  const initialRating = value(
    "passengerRating",
    execution.passengerRating !== null ? String(execution.passengerRating) : "",
  );
  const [selectedRating, setSelectedRating] = useState<string>(initialRating);

  return (
    <form
      action={formAction}
      noValidate
      aria-label="ثبت نظرسنجی مسافر"
      aria-busy={pending}
      className={styles.surveyForm}
    >
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error] ?? state.error}
        </InlineNotice>
      )}

      <div className={styles.surveyRatingSection}>
        <div className={styles.surveyRatingHeader}>
          <span id={`${prefix}-rating-label`} className={styles.ratingLegend}>
            امتیاز مسافر به کیفیت سفر (۱ تا ۵)
          </span>
          {selectedRating !== "" && (
            <button
              type="button"
              onClick={() => setSelectedRating("")}
              className={styles.ratingClearButton}
              disabled={pending}
            >
              پاک کردن امتیاز
            </button>
          )}
        </div>

        <div
          role="radiogroup"
          aria-labelledby={`${prefix}-rating-label`}
          className={styles.ratingGrid}
        >
          {RATING_OPTIONS.map((item) => {
            const isSelected = selectedRating === String(item.value);
            return (
              <label
                key={item.value}
                className={styles.ratingOption}
                data-selected={isSelected ? "true" : undefined}
                onClick={(e) => {
                  if (isSelected) {
                    e.preventDefault();
                    setSelectedRating("");
                  }
                }}
              >
                <input
                  type="radio"
                  name="passengerRating"
                  value={item.value}
                  checked={isSelected}
                  onChange={() => setSelectedRating(String(item.value))}
                  className={styles.ratingRadioInput}
                  disabled={pending}
                />
                <span className={styles.ratingNumber}>{item.number}</span>
                <span className={styles.ratingLabel}>{item.label}</span>
              </label>
            );
          })}
        </div>
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
          placeholder="توضیحات یا نظر مسافر (اختیاری)"
        />
      </FormField>

      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending
            ? "در حال ثبت…"
            : execution.passengerRating !== null
              ? "ذخیره ویرایش نظرسنجی"
              : "ذخیره نظرسنجی"}
        </ActionButton>
      </FormActions>
    </form>
  );
}
