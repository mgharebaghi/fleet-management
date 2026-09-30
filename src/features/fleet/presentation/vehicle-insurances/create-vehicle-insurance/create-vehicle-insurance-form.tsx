"use client";

import { InsuranceFormFields } from "../components/insurance-form-fields";

import { useActionState, useMemo } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";

import { FormActions, FormSection } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";

import type { InsuranceVehicle } from "../../../application/vehicle-insurances/vehicle-insurance";
import { createVehicleInsuranceAction } from "./create-vehicle-insurance.action";
import { insuranceValidationMessages } from "../components/insurance-form-messages";
import type { InsuranceFormValues } from "../components/insurance-form-data";
import { buildVehicleOptions } from "../../vehicles/components/vehicle-picker-options";

export function CreateVehicleInsuranceForm({ vehicles }: { vehicles: InsuranceVehicle[] }) {
  const [state, formAction, pending] = useActionState(createVehicleInsuranceAction, {});
  const errors: Partial<Record<keyof InsuranceFormValues, string>> = {};
  if (state.error?.type === "VALIDATION_ERROR") {
    for (const field of Object.keys(state.error.fieldErrors) as (keyof InsuranceFormValues)[]) {
      const code = state.error.fieldErrors[field];
      if (code) errors[field] = insuranceValidationMessages[code];
    }
  } else if (state.error?.type === "VEHICLE_NOT_FOUND") {
    errors.vehicleId = "خودروی انتخاب‌شده دیگر موجود نیست؛ صفحه را تازه کنید.";
  }
  const valueOf = (field: keyof InsuranceFormValues) => state.values?.[field] ?? "";
  const vehicleOptions = useMemo(() => buildVehicleOptions(vehicles), [vehicles]);

  return (
    <form action={formAction} noValidate aria-busy={pending}>
      {(state.error || state.formError) && <InlineNotice tone="danger" role="alert">
        {state.formError ? "ثبت بیمه انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید." : "اطلاعات مشخص‌شده را اصلاح کنید."}
      </InlineNotice>}
      <FormSection title="مشخصات بیمه" description="خودرو، نوع بیمه‌نامه و دورهٔ پوشش.">
      <FormGrid>
        <InsuranceFormFields vehicleOptions={vehicleOptions} valueOf={valueOf} errors={errors} pending={pending} />
      </FormGrid>
      </FormSection>
      {pending && <LoadingIndicator label="در حال ثبت بیمه…" />}
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>{pending ? "در حال ثبت…" : "ثبت بیمه خودرو"}</ActionButton>
      </FormActions>
    </form>
  );
}
