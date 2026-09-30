"use client";

import { InsuranceFormFields } from "../components/insurance-form-fields";

import { useActionState, useMemo } from "react";
import type { ConfirmDialogIdentityLine } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";

import { FormField, FormActions, FormSection } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";

import type { InsuranceVehicle, VehicleInsuranceSummary } from "../../../application/vehicle-insurances/vehicle-insurance";
import { buildVehicleOptions } from "../../vehicles/components/vehicle-picker-options";
import { insuranceValidationMessages } from "../components/insurance-form-messages";
import type { InsuranceFormValues } from "../components/insurance-form-data";
import { updateVehicleInsuranceAction } from "./update-vehicle-insurance.action";
import styles from "./update-vehicle-insurance-form.module.css";

function toFormValues(insurance: VehicleInsuranceSummary): InsuranceFormValues {
  return {
    vehicleId: String(insurance.vehicleId),
    insuranceType: insurance.insuranceType,
    insuranceCompany: insurance.insuranceCompany ?? "",
    policyNo: insurance.policyNo ?? "",
    startDate: insurance.startDate.toISOString().slice(0, 10),
    expireDate: insurance.expireDate.toISOString().slice(0, 10),
    premiumAmount: insurance.premiumAmount ?? "",
    coverageAmount: insurance.coverageAmount ?? "",
  };
}

function buildInsuranceIdentityLines(
  insurance: VehicleInsuranceSummary,
): ConfirmDialogIdentityLine[] {
  const lines: ConfirmDialogIdentityLine[] = [];

  if (insurance.insuranceCompany) {
    lines.push({ label: "بیمه‌گر", value: insurance.insuranceCompany });
  }
  if (insurance.policyNo) {
    lines.push({ label: "شماره بیمه‌نامه", value: insurance.policyNo });
  }

  return lines;
}

export function UpdateVehicleInsuranceForm({
  insurance,
  vehicles,
}: {
  insurance: VehicleInsuranceSummary;
  vehicles: InsuranceVehicle[];
}) {
  const [state, formAction, pending] = useActionState(updateVehicleInsuranceAction, {});
  const errors: Partial<Record<keyof InsuranceFormValues, string>> = {};
  if (state.error?.type === "VALIDATION_ERROR") {
    for (const field of Object.keys(state.error.fieldErrors) as (keyof InsuranceFormValues)[]) {
      const code = state.error.fieldErrors[field];
      if (code) errors[field] = insuranceValidationMessages[code];
    }
  } else if (state.error?.type === "VEHICLE_NOT_FOUND") {
    errors.vehicleId = "خودروی انتخاب‌شده دیگر موجود نیست؛ صفحه را تازه کنید.";
  }
  const initialValues = useMemo(() => toFormValues(insurance), [insurance]);
  const valueOf = (field: keyof InsuranceFormValues) => state.values?.[field] ?? initialValues[field];
  const vehicleOptions = useMemo(() => buildVehicleOptions(vehicles), [vehicles]);

  return (
    <form id="update-vehicle-insurance-form" action={formAction} noValidate aria-busy={pending}>
      <input type="hidden" name="vehicleInsuranceId" value={insurance.vehicleInsuranceId} />

      {(state.error || state.formError) && <InlineNotice tone="danger" role="alert">
        {state.formError === "not_found"
          ? "این بیمه‌نامه قبلاً حذف شده است."
          : state.formError
            ? "ذخیره تغییرات انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید."
            : "اطلاعات مشخص‌شده را اصلاح کنید."}
      </InlineNotice>}
      <FormSection title="مشخصات بیمه" description="خودرو، نوع بیمه‌نامه و دورهٔ پوشش.">
      <FormGrid>
        <InsuranceFormFields vehicleOptions={vehicleOptions} valueOf={valueOf} errors={errors} pending={pending} />
        <FormField>
          <label className={styles.checkboxRow} htmlFor="isActive">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked={insurance.isActive} disabled={pending} />
            فعال
          </label>
        </FormField>
      </FormGrid>
      </FormSection>
      {pending && <LoadingIndicator label="در حال ذخیره تغییرات…" />}
      <FormActions separated>
        <ConfirmedSubmitButton
          formId="update-vehicle-insurance-form"
          titleId="update-vehicle-insurance-confirm-title"
          dialogTitle="ذخیره تغییرات"
          recordName={`${insurance.insuranceType} — ${insurance.vehicle.brandName} ${insurance.vehicle.modelName}`}
          identityLines={buildInsuranceIdentityLines(insurance)}
          message="آیا از ذخیره تغییرات این بیمه‌نامه مطمئن هستید؟"
          label="ذخیره تغییرات"
          pendingLabel="در حال ذخیره…"
          confirmLabel="تأیید و ذخیره"
          pending={pending}
        />
      </FormActions>
    </form>
  );
}
