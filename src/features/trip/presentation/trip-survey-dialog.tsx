"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { Dialog } from "@/components/ui/dialog/dialog";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type {
  TripExecutionRecord,
  TripPersonReference,
} from "../application/trip-records";
import { formatTripDateTime } from "./trip-format";
import { tripMessages, type TripActionState } from "./trip-form-data";
import { savePassengerSurveyAction } from "./trip.actions";
import styles from "./trip-forms.module.css";

const RATING_OPTIONS = [
  { value: 1, label: "خیلی ضعیف", number: "۱" },
  { value: 2, label: "ضعیف", number: "۲" },
  { value: 3, label: "متوسط", number: "۳" },
  { value: 4, label: "خوب", number: "۴" },
  { value: 5, label: "عالی", number: "۵" },
];

export function TripSurveyButton({
  tripRequestId,
  passenger,
  execution,
}: {
  tripRequestId: number;
  passenger: TripPersonReference;
  execution: TripExecutionRecord;
}) {
  const [open, setOpen] = useState(false);
  const isRecorded = execution.passengerRating !== null;

  return (
    <>
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isRecorded ? "مشاهده / ویرایش نظرسنجی" : "ثبت نظرسنجی"}
      </ActionButton>
      {open && (
        <TripSurveyDialog
          tripRequestId={tripRequestId}
          passenger={passenger}
          execution={execution}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function TripSurveyDialog({
  tripRequestId,
  passenger,
  execution,
  open,
  onClose,
}: {
  tripRequestId: number;
  passenger: TripPersonReference;
  execution: TripExecutionRecord;
  open: boolean;
  onClose: () => void;
}) {
  const prefix = useId();
  const titleId = `${prefix}-survey-dialog-title`;
  const isRecorded = execution.passengerRating !== null;

  const [state, formAction, pending] = useActionState(
    async (prevState: TripActionState, formData: FormData) => {
      const res = await savePassengerSurveyAction(
        tripRequestId,
        execution.tripExecutionId,
        prevState,
        formData,
      );
      if (res?.error) return res;
      onClose();
      return res;
    },
    {},
  );

  const value = (name: string, fallback = "") =>
    state?.values?.[name] ?? fallback;

  const initialRating = value(
    "passengerRating",
    execution.passengerRating !== null ? String(execution.passengerRating) : "",
  );
  const [selectedRating, setSelectedRating] = useState<string>(initialRating);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={isRecorded ? "مشاهده و ویرایش نظرسنجی" : "ثبت نظرسنجی مسافر"}
    >
      <form
        action={formAction}
        noValidate
        aria-label="فرم نظرسنجی مسافر"
        aria-busy={pending}
        className={styles.surveyForm}
      >
        {state?.error && (
          <InlineNotice tone="danger" role="alert">
            {tripMessages[state.error] ?? state.error}
          </InlineNotice>
        )}

        <div className={styles.surveyContextBar}>
          <div className={styles.surveyContextFacts}>
            <span className={styles.surveyContextFact}>
              <span>مسافر:</span>
              <strong>
                {passenger.firstName} {passenger.lastName}
              </strong>
              {passenger.personnelNo && (
                <span className={styles.muted}>
                  (پرسنلی: <TechnicalValue>{passenger.personnelNo}</TechnicalValue>)
                </span>
              )}
            </span>
            {execution.surveyDateTime && (
              <span className={styles.surveyContextFact}>
                <span>زمان ثبت:</span>
                <span>{formatTripDateTime(execution.surveyDateTime)}</span>
              </span>
            )}
          </div>
          <StatusBadge
            label={isRecorded ? "نظرسنجی ثبت‌شده" : "در انتظار ثبت"}
            tone={isRecorded ? "positive" : "info"}
          />
        </div>

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
          <FieldLabel htmlFor={`${prefix}-comment`}>نظر یا بازخورد مسافر</FieldLabel>
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
            placeholder="توضیحات، انتقادات یا پیشنهادات مسافر دربارهٔ کیفیت سفر (اختیاری)"
          />
        </FormField>

        <FormActions separated>
          <ActionButton type="submit" disabled={pending} pending={pending}>
            {pending
              ? "در حال ثبت…"
              : isRecorded
                ? "ذخیره تغییرات"
                : "ثبت نظرسنجی"}
          </ActionButton>
          <ActionButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            انصراف
          </ActionButton>
        </FormActions>
      </form>
    </Dialog>
  );
}
