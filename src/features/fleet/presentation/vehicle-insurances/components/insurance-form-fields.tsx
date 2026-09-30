"use client";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import { FormField, FieldLabel, FieldErrors, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
import { insuranceLabels } from "./insurance-form-messages";
import type { InsuranceFormValues } from "./insurance-form-data";
import type { buildVehicleOptions } from "../../vehicles/components/vehicle-picker-options";

export function InsuranceFormFields({ vehicleOptions, valueOf, errors, pending }: {
  vehicleOptions: ReturnType<typeof buildVehicleOptions>;
  valueOf: (field: keyof InsuranceFormValues) => string;
  errors: Partial<Record<keyof InsuranceFormValues, string>>;
  pending: boolean;
}) {
  const errorProps = (field: keyof InsuranceFormValues) => ({
    invalid: Boolean(errors[field]), describedBy: errors[field] ? `${field}-error` : undefined, disabled: pending,
  });
  return (
    <>
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
    </>
  );
}
