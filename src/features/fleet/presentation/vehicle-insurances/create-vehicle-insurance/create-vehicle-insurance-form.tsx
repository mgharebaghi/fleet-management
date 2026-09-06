"use client";

import { useActionState, useMemo } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import { FormField, FieldLabel, FieldErrors, FormActions, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
import type { InsuranceVehicle } from "../../../application/vehicle-insurances/vehicle-insurance";
import { createVehicleInsuranceAction } from "./create-vehicle-insurance.action";
import { insuranceLabels, insuranceValidationMessages } from "./create-vehicle-insurance.messages";
import type { InsuranceFormValues } from "./create-vehicle-insurance.form-data";
import { buildVehicleOptions } from "./vehicle-options";

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
  const errorProps = (field: keyof InsuranceFormValues) => ({
    invalid: Boolean(errors[field]), describedBy: errors[field] ? `${field}-error` : undefined, disabled: pending,
  });
  const vehicleOptions = useMemo(() => buildVehicleOptions(vehicles), [vehicles]);

  return (
    <form action={formAction} noValidate aria-busy={pending}>
      {(state.error || state.formError) && <InlineNotice tone="danger" role="alert">
        {state.formError ? "ثبت بیمه انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید." : "اطلاعات مشخص‌شده را اصلاح کنید."}
      </InlineNotice>}
      <FormGrid>
        <FormField>
          <SearchableSelect
            name="vehicleId"
            label="خودرو"
            required
            options={vehicleOptions}
            defaultValue={valueOf("vehicleId")}
            placeholder="انتخاب خودرو"
            searchPlaceholder="جستجوی برند، مدل، پلاک یا کد خودرو…"
            normalizeQuery={normalizeVehicleSearchText}
            disabled={pending}
            invalid={Boolean(errors.vehicleId)}
            describedBy={errors.vehicleId ? "vehicleId-error" : undefined}
          />
          <FieldErrors id="vehicleId-error" messages={errors.vehicleId ? [errors.vehicleId] : []} />
        </FormField>
        {(["insuranceType", "insuranceCompany", "policyNo"] as const).map(field => <FormField key={field}>
          <FieldLabel htmlFor={field} required={field === "insuranceType"}>{insuranceLabels[field]}</FieldLabel>
          <input id={field} name={field} type="text" className={formControlClassName} dir={field === "policyNo" ? "ltr" : "rtl"} defaultValue={valueOf(field)} disabled={pending} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} />
          <FieldErrors id={`${field}-error`} messages={errors[field] ? [errors[field]] : []} />
        </FormField>)}
        {(["startDate", "expireDate"] as const).map(field => <FormField key={field}>
          <JalaliDatePicker name={field} label={insuranceLabels[field]} defaultValue={valueOf(field)} {...errorProps(field)} />
          <FieldErrors id={`${field}-error`} messages={errors[field] ? [errors[field]] : []} />
        </FormField>)}
        {(["premiumAmount", "coverageAmount"] as const).map(field => <FormField key={field}>
          <MoneyInput id={field} name={field} label={insuranceLabels[field]} defaultValue={valueOf(field)} {...errorProps(field)} />
          <FieldErrors id={`${field}-error`} messages={errors[field] ? [errors[field]] : []} />
        </FormField>)}
      </FormGrid>
      {pending && <LoadingIndicator label="در حال ثبت بیمه…" />}
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>{pending ? "در حال ثبت…" : "ثبت بیمه خودرو"}</ActionButton>
        <ActionLink href="/fleet/vehicle-insurances" variant="quiet">بازگشت به بیمه‌ها</ActionLink>
      </FormActions>
    </form>
  );
}
