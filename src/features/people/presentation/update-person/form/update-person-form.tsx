"use client";

import { useActionState } from "react";

import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
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

import type { ConfirmDialogIdentityLine } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import type { Person } from "../../../application/person";
import { updatePersonAction } from "../action/update-person.action";
import { initialUpdatePersonActionState } from "../action/update-person.action-state";
import styles from "./update-person-form.module.css";
import {
  getUpdatePersonFieldErrorMessages,
  getUpdatePersonStatusMessage,
} from "./update-person.messages";

const UPDATE_PERSON_TITLE_ID = "update-person-title";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function buildPersonIdentityLines(person: Person): ConfirmDialogIdentityLine[] {
  const lines: ConfirmDialogIdentityLine[] = [];

  if (person.personnelNo) {
    lines.push({ label: "شمارهٔ پرسنلی", value: person.personnelNo });
  }
  if (person.nationalCode) {
    lines.push({ label: "کد ملی", value: person.nationalCode });
  }

  return lines;
}

export function UpdatePersonForm({ person }: { person: Person }) {
  const [actionState, formAction, isPending] = useActionState(
    updatePersonAction,
    initialUpdatePersonActionState,
  );
  const personnelNoErrors = getUpdatePersonFieldErrorMessages(
    actionState,
    "personnelNo",
  );
  const firstNameErrors = getUpdatePersonFieldErrorMessages(
    actionState,
    "firstName",
  );
  const lastNameErrors = getUpdatePersonFieldErrorMessages(
    actionState,
    "lastName",
  );
  const nationalCodeErrors = getUpdatePersonFieldErrorMessages(
    actionState,
    "nationalCode",
  );
  const cardNoErrors = getUpdatePersonFieldErrorMessages(actionState, "cardNo");
  const mobileErrors = getUpdatePersonFieldErrorMessages(actionState, "mobile");
  const employmentDateErrors = getUpdatePersonFieldErrorMessages(
    actionState,
    "employmentDate",
  );
  const statusMessage = getUpdatePersonStatusMessage(actionState);

  return (
    <PageShell width="narrow" labelledBy={UPDATE_PERSON_TITLE_ID}>
      <PageHeader
        eyebrow="مدیریت اشخاص"
        title="ویرایش اطلاعات شخص"
        titleId={UPDATE_PERSON_TITLE_ID}
        description={`ویرایش اطلاعات ${person.firstName} ${person.lastName}`}
        action={
          <BackLink
            label="انصراف و بازگشت به اشخاص"
            href="/people"
          />
        }
        compactAction
      />

      <form
        id="update-person-form"
        action={formAction}
        className={styles.form}
        aria-busy={isPending}
        aria-labelledby="person-details-title"
        noValidate
      >
        <input type="hidden" name="personId" value={person.personId} />

        <div className={styles.formHeader}>
          <div>
            <h2 id="person-details-title">اطلاعات شخص</h2>
            <p>اطلاعات هویتی، سازمانی و تاریخ استخدام را ویرایش کنید.</p>
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
              defaultValue={person.firstName}
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
              defaultValue={person.lastName}
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
              defaultValue={person.personnelNo ?? ""}
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
              defaultValue={person.nationalCode ?? ""}
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
              defaultValue={person.cardNo ?? ""}
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
              defaultValue={person.mobile ?? ""}
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
              defaultValue={toDateInputValue(person.employmentDate)}
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

          <FormField>
            <label className={styles.checkboxRow} htmlFor="isActive">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={person.isActive}
                disabled={isPending}
              />
              فعال
            </label>
          </FormField>
        </FormGrid>

        {isPending && <LoadingIndicator label="در حال ذخیره اطلاعات…" />}

        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage.text}
          </InlineNotice>
        )}

        <FormActions>
          <ConfirmedSubmitButton
            formId="update-person-form"
            titleId="update-person-confirm-title"
            dialogTitle="ذخیره تغییرات"
            recordName={`${person.firstName} ${person.lastName}`}
            identityLines={buildPersonIdentityLines(person)}
            message="آیا از ذخیره تغییرات این شخص مطمئن هستید؟"
            label="ذخیره تغییرات"
            pendingLabel="در حال ذخیره…"
            confirmLabel="تأیید و ذخیره"
            pending={isPending}
          />
        </FormActions>
      </form>
    </PageShell>
  );
}
