"use client";

import { PersonFormFields } from "../../components/person-form-fields";

import { useActionState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { BackLink } from "../../../../../components/ui/back-link/back-link";

import { FormActions, FormSection } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";

import { createPersonAction } from "../action/create-person.action";
import { initialCreatePersonActionState } from "../action/create-person.action-state";
import styles from "./create-person-form.module.css";
import { getCreatePersonFieldErrorMessages, getCreatePersonStatusMessage } from "./create-person.messages";

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
        action={<BackLink label="انصراف و بازگشت به اشخاص" href="/people" />}
        compactAction
      />

      <form
        action={formAction}
        className={styles.form}
        aria-busy={isPending}
        aria-labelledby="person-details-title"
        noValidate
      >
        <FormSection
          title="اطلاعات شخص"
          titleId="person-details-title"
          description="اطلاعات هویتی، سازمانی و تاریخ استخدام را وارد کنید."
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
          />
        </FormGrid>
        </FormSection>

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
        </FormActions>
      </form>
    </PageShell>
  );
}
