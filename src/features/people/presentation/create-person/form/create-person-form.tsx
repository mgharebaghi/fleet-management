"use client";

import { useActionState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldErrors,
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";

import { createPersonAction } from "../action/create-person.action";
import { initialCreatePersonActionState } from "../action/create-person.action-state";
import styles from "./create-person-form.module.css";
import {
  getCreatePersonFieldErrorMessages,
  getCreatePersonStatusMessage,
} from "./create-person.messages";

const CREATE_PERSON_TITLE_ID = "create-person-title";

export function CreatePersonForm() {
  const [actionState, formAction, isPending] = useActionState(
    createPersonAction,
    initialCreatePersonActionState,
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

  return (
    <PageShell width="narrow" labelledBy={CREATE_PERSON_TITLE_ID}>
      <PageHeader
        eyebrow="مدیریت اشخاص"
        title="ثبت شخص جدید"
        titleId={CREATE_PERSON_TITLE_ID}
        description="اطلاعات فردی و سازمانی شخص را وارد کنید."
      />

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

        <FormGrid>
          <FormField>
            <FieldLabel htmlFor="firstName" required>
              نام
            </FieldLabel>
            <input
              className={formControlClassName}
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
            <FieldErrors id="firstName-error" messages={firstNameErrors} />
          </FormField>

          <FormField>
            <FieldLabel htmlFor="lastName" required>
              نام خانوادگی
            </FieldLabel>
            <input
              className={formControlClassName}
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
            <FieldErrors id="lastName-error" messages={lastNameErrors} />
          </FormField>

          <FormField>
            <FieldLabel htmlFor="personnelNo">شماره پرسنلی</FieldLabel>
            <input
              className={formControlClassName}
              id="personnelNo"
              name="personnelNo"
              type="text"
              dir="ltr"
              disabled={isPending}
              aria-invalid={personnelNoErrors.length > 0}
              aria-describedby={
                personnelNoErrors.length > 0 ? "personnelNo-error" : undefined
              }
            />
            <FieldErrors
              id="personnelNo-error"
              messages={personnelNoErrors}
            />
          </FormField>

          <FormField>
            <FieldLabel htmlFor="nationalCode">کد ملی</FieldLabel>
            <input
              className={formControlClassName}
              id="nationalCode"
              name="nationalCode"
              type="text"
              inputMode="numeric"
              dir="ltr"
              disabled={isPending}
              aria-invalid={nationalCodeErrors.length > 0}
              aria-describedby={
                nationalCodeErrors.length > 0 ? "nationalCode-error" : undefined
              }
            />
            <FieldErrors
              id="nationalCode-error"
              messages={nationalCodeErrors}
            />
          </FormField>

          <FormField>
            <FieldLabel htmlFor="cardNo">شماره کارت</FieldLabel>
            <input
              className={formControlClassName}
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
            <FieldErrors id="cardNo-error" messages={cardNoErrors} />
          </FormField>

          <FormField>
            <FieldLabel htmlFor="mobile">شماره موبایل</FieldLabel>
            <input
              className={formControlClassName}
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
            <FieldErrors id="mobile-error" messages={mobileErrors} />
          </FormField>

          <FormField>
            <JalaliDatePicker
              name="employmentDate"
              label="تاریخ استخدام (شمسی)"
              invalid={employmentDateErrors.length > 0}
              describedBy={
                employmentDateErrors.length > 0
                  ? "employmentDate-error"
                  : undefined
              }
              disabled={isPending}
            />
            <FieldErrors
              id="employmentDate-error"
              messages={employmentDateErrors}
            />
          </FormField>
        </FormGrid>

        {isPending && <LoadingIndicator label="در حال ثبت اطلاعات…" />}

        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage.text}
          </InlineNotice>
        )}

        <FormActions>
          <ActionButton type="submit" disabled={isPending} pending={isPending}>
            {isPending ? "در حال ثبت…" : "ثبت شخص"}
          </ActionButton>
          <ActionLink href="/people" variant="quiet">
            انصراف
          </ActionLink>
        </FormActions>
      </form>
    </PageShell>
  );
}
