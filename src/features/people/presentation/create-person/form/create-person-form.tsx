"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useActionState, useMemo, useState } from "react";

import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";

import { createPersonAction } from "../action/create-person.action";
import { initialCreatePersonActionState } from "../action/create-person.action-state";
import styles from "./create-person-form.module.css";
import {
  getCreatePersonFieldErrorMessages,
  getCreatePersonStatusMessage,
} from "./create-person.messages";
import { getGregorianEmploymentDateValue } from "./jalali-date";

const jalaliMonths = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const persianNumberFormatter = new Intl.NumberFormat("fa-IR", {
  useGrouping: false,
});

type FieldErrorMessagesProps = {
  id: string;
  messages: string[];
};

function FieldErrorMessages({ id, messages }: FieldErrorMessagesProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div id={id} className={styles.fieldErrors} role="alert">
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

function getSelectableDayCount(jalaliYear: string, jalaliMonth: string) {
  const month = Number(jalaliMonth);

  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  if (month === 12 && jalaliYear !== "") {
    return getGregorianEmploymentDateValue(jalaliYear, "12", "30") ===
      "invalid"
      ? 29
      : 30;
  }

  return 30;
}

export function CreatePersonForm() {
  const [actionState, formAction, isPending] = useActionState(
    createPersonAction,
    initialCreatePersonActionState,
  );
  const [jalaliYear, setJalaliYear] = useState("");
  const [jalaliMonth, setJalaliMonth] = useState("");
  const [jalaliDay, setJalaliDay] = useState("");

  const selectableDayCount = getSelectableDayCount(
    jalaliYear,
    jalaliMonth,
  );
  const selectableDays = useMemo(
    () => Array.from({ length: selectableDayCount }, (_, index) => index + 1),
    [selectableDayCount],
  );
  const employmentDateValue = getGregorianEmploymentDateValue(
    jalaliYear,
    jalaliMonth,
    jalaliDay,
  );

  const personnelNoErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "personnelNo",
  );
  const firstNameErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "firstName",
  );
  const lastNameErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "lastName",
  );
  const nationalCodeErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "nationalCode",
  );
  const cardNoErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "cardNo",
  );
  const mobileErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "mobile",
  );
  const employmentDateErrors = getCreatePersonFieldErrorMessages(
    actionState,
    "employmentDate",
  );
  const statusMessage = getCreatePersonStatusMessage(actionState);

  function handleJalaliYearChange(event: ChangeEvent<HTMLInputElement>) {
    const nextYear = event.target.value;
    const nextDayCount = getSelectableDayCount(nextYear, jalaliMonth);

    setJalaliYear(nextYear);
    if (Number(jalaliDay) > nextDayCount) {
      setJalaliDay("");
    }
  }

  function handleJalaliMonthChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMonth = event.target.value;
    const nextDayCount = getSelectableDayCount(jalaliYear, nextMonth);

    setJalaliMonth(nextMonth);
    if (Number(jalaliDay) > nextDayCount) {
      setJalaliDay("");
    }
  }

  return (
    <main className={styles.page} lang="fa" dir="rtl">
      <section className={styles.card} aria-labelledby="create-person-title">
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>مدیریت اشخاص</p>
            <h1 id="create-person-title">ثبت شخص جدید</h1>
            <p className={styles.description}>
              اطلاعات فردی و سازمانی شخص را وارد کنید.
            </p>
          </div>

          <div className={styles.brandArea}>
            <div className={styles.logoFrame}>
              <Image
                className={styles.logo}
                src="/brand/fleet-management-logo.png"
                alt="نشان سامانه مدیریت ناوگان"
                width={64}
                height={48}
                priority
              />
            </div>
            <div className={styles.brandCopy}>
              <strong>سامانه مدیریت ناوگان</strong>
              <span>اطلاعات پایه اشخاص</span>
            </div>
          </div>
        </header>

        <form
          action={formAction}
          className={styles.form}
          aria-busy={isPending}
          aria-labelledby="person-details-title"
          noValidate
        >
          <div className={styles.formHeader}>
            <div>
              <h2 id="person-details-title">اطلاعات شخص</h2>
              <p>اطلاعات هویتی، سازمانی و تاریخ استخدام را وارد کنید.</p>
            </div>
            <p className={styles.requiredHint}>
              <span aria-hidden="true">*</span> فیلد الزامی
            </p>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <label htmlFor="firstName">نام</label>
                <span aria-hidden="true">*</span>
              </div>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                disabled={isPending}
                aria-invalid={firstNameErrors.length > 0}
                aria-describedby={
                  firstNameErrors.length > 0 ? "firstName-error" : undefined
                }
              />
              <FieldErrorMessages
                id="firstName-error"
                messages={firstNameErrors}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>
                <label htmlFor="lastName">نام خانوادگی</label>
                <span aria-hidden="true">*</span>
              </div>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                disabled={isPending}
                aria-invalid={lastNameErrors.length > 0}
                aria-describedby={
                  lastNameErrors.length > 0 ? "lastName-error" : undefined
                }
              />
              <FieldErrorMessages
                id="lastName-error"
                messages={lastNameErrors}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="personnelNo">شماره پرسنلی</label>
              <input
                id="personnelNo"
                name="personnelNo"
                type="text"
                dir="ltr"
                disabled={isPending}
                aria-invalid={personnelNoErrors.length > 0}
                aria-describedby={
                  personnelNoErrors.length > 0
                    ? "personnelNo-error"
                    : undefined
                }
              />
              <FieldErrorMessages
                id="personnelNo-error"
                messages={personnelNoErrors}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="nationalCode">کد ملی</label>
              <input
                id="nationalCode"
                name="nationalCode"
                type="text"
                inputMode="numeric"
                dir="ltr"
                disabled={isPending}
                aria-invalid={nationalCodeErrors.length > 0}
                aria-describedby={
                  nationalCodeErrors.length > 0
                    ? "nationalCode-error"
                    : undefined
                }
              />
              <FieldErrorMessages
                id="nationalCode-error"
                messages={nationalCodeErrors}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cardNo">شماره کارت</label>
              <input
                id="cardNo"
                name="cardNo"
                type="text"
                dir="ltr"
                disabled={isPending}
                aria-invalid={cardNoErrors.length > 0}
                aria-describedby={
                  cardNoErrors.length > 0 ? "cardNo-error" : undefined
                }
              />
              <FieldErrorMessages
                id="cardNo-error"
                messages={cardNoErrors}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="mobile">شماره موبایل</label>
              <input
                id="mobile"
                name="mobile"
                type="text"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                disabled={isPending}
                aria-invalid={mobileErrors.length > 0}
                aria-describedby={
                  mobileErrors.length > 0 ? "mobile-error" : undefined
                }
              />
              <FieldErrorMessages
                id="mobile-error"
                messages={mobileErrors}
              />
            </div>

            <fieldset
              className={styles.dateField}
              aria-describedby={
                employmentDateErrors.length > 0
                  ? "employmentDate-error"
                  : undefined
              }
            >
              <legend>تاریخ استخدام (شمسی)</legend>
              <input
                name="employmentDate"
                type="text"
                value={employmentDateValue}
                readOnly
                hidden
              />
              <div className={styles.dateControls} dir="ltr">
                <label className={styles.datePart} htmlFor="jalali-year">
                  <span>سال</span>
                  <input
                    id="jalali-year"
                    type="text"
                    inputMode="numeric"
                    value={jalaliYear}
                    onChange={handleJalaliYearChange}
                    placeholder="۱۴۰۳"
                    disabled={isPending}
                    aria-invalid={employmentDateErrors.length > 0}
                  />
                </label>

                <label className={styles.datePart} htmlFor="jalali-month">
                  <span>ماه</span>
                  <select
                    id="jalali-month"
                    value={jalaliMonth}
                    onChange={handleJalaliMonthChange}
                    disabled={isPending}
                    aria-invalid={employmentDateErrors.length > 0}
                  >
                    <option value="">انتخاب ماه</option>
                    {jalaliMonths.map((monthName, index) => (
                      <option key={monthName} value={index + 1}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.datePart} htmlFor="jalali-day">
                  <span>روز</span>
                  <select
                    id="jalali-day"
                    value={jalaliDay}
                    onChange={(event) => setJalaliDay(event.target.value)}
                    disabled={isPending}
                    aria-invalid={employmentDateErrors.length > 0}
                  >
                    <option value="">انتخاب روز</option>
                    {selectableDays.map((day) => (
                      <option key={day} value={day}>
                        {persianNumberFormatter.format(day)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <FieldErrorMessages
                id="employmentDate-error"
                messages={employmentDateErrors}
              />
            </fieldset>
          </div>

          <div className={styles.feedback}>
            {isPending && <LoadingIndicator label="در حال ثبت اطلاعات…" />}
            {statusMessage && (
              <p
                className={
                  statusMessage.type === "success"
                    ? styles.successMessage
                    : styles.formError
                }
                role={statusMessage.type === "error" ? "alert" : "status"}
              >
                {statusMessage.text}
              </p>
            )}
          </div>

          <button className={styles.submitButton} type="submit" disabled={isPending}>
            {isPending && <span className={styles.spinner} aria-hidden="true" />}
            <span>{isPending ? "در حال ثبت…" : "ثبت شخص"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
