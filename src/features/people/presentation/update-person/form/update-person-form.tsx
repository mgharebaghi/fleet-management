"use client";

import { PersonFormFields } from "../../components/person-form-fields";

import { useActionState } from "react";

import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";

import { FormActions, FormField, FormSection } from "../../../../../components/ui/form-field/form-field";
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
import { getUpdatePersonFieldErrorMessages, getUpdatePersonStatusMessage } from "./update-person.messages";

const UPDATE_PERSON_TITLE_ID = "update-person-title";

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

        <FormSection
          title="اطلاعات شخص"
          titleId="person-details-title"
          description="اطلاعات هویتی، سازمانی و تاریخ استخدام را ویرایش کنید."
          aside={
            <p className={styles.requiredHint}>
              <span aria-hidden="true">*</span> فیلد الزامی
            </p>
          }
        >

        <FormGrid>
          <PersonFormFields
            isPending={isPending}
            errors={{ personnelNo: personnelNoErrors, firstName: firstNameErrors, lastName: lastNameErrors, nationalCode: nationalCodeErrors, cardNo: cardNoErrors, mobile: mobileErrors, employmentDate: employmentDateErrors }}
            person={person}
          />
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
        </FormSection>

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
