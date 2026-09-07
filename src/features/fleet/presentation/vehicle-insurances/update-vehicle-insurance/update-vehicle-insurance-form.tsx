"use client";

import { useActionState, useMemo } from "react";
import type { ConfirmDialogIdentityLine } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import { FormField, FieldLabel, FieldErrors, FormActions, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
import type { InsuranceVehicle, VehicleInsuranceSummary } from "../../../application/vehicle-insurances/vehicle-insurance";
import { buildVehicleOptions } from "../create-vehicle-insurance/vehicle-options";
import { insuranceLabels, insuranceValidationMessages } from "../create-vehicle-insurance/create-vehicle-insurance.messages";
import type { InsuranceFormValues } from "../create-vehicle-insurance/create-vehicle-insurance.form-data";
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
  const errorProps = (field: keyof InsuranceFormValues) => ({
    invalid: Boolean(errors[field]), describedBy: errors[field] ? `${field}-error` : undefined, disabled: pending,
  });
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
        <FormField>
          <label className={styles.checkboxRow} htmlFor="isActive">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked={insurance.isActive} disabled={pending} />
            فعال
          </label>
        </FormField>
      </FormGrid>
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
