"use client";

import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { useActionState, useMemo } from "react";

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
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import type { SearchableSelectOption } from "../../../../../components/ui/searchable-select/searchable-select-options";
import type { CatalogEntry } from "../../../application/catalogs/catalog-entry";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { NewVehicle } from "../../../application/vehicles/vehicle";
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
import { createVehicleAction } from "./create-vehicle.action";
import type { VehicleFormValues } from "./create-vehicle.form-data";
import {
  vehicleFailureMessages,
  vehicleLabels,
  vehiclePlatePartCaptions,
  vehicleValidationMessages,
} from "./create-vehicle.messages";
import styles from "./create-vehicle-form.module.css";

type VehicleFieldName = keyof NewVehicle;

type VehicleFieldErrors = Partial<Record<VehicleFieldName, string>>;

type FieldSpan = 2 | 3 | 4 | 6;

type FieldFrameProps = {
  span: FieldSpan;
  children: ReactNode;
};

function FieldFrame({ span, children }: FieldFrameProps) {
  return <FormField className={styles[`span${span}`]}>{children}</FormField>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return <FieldErrors id={id} messages={message ? [message] : []} />;
}

type TextFieldProps = {
  name: VehicleFieldName;
  span: FieldSpan;
  defaultValue: string;
  error?: string;
  inputMode?: "numeric" | "decimal";
  placeholder?: string;
  direction?: "ltr" | "rtl";
  type?: HTMLInputTypeAttribute;
};

function VehicleTextField({
  name,
  span,
  defaultValue,
  error,
  inputMode,
  placeholder,
  direction = "ltr",
  type = "text",
}: TextFieldProps) {
  const errorId = `${name}-error`;

  return (
    <FieldFrame span={span}>
      <FieldLabel htmlFor={name}>{vehicleLabels[name]}</FieldLabel>

      <input
        className={formControlClassName}
        id={name}
        name={name}
        type={type}
        dir={direction}
        inputMode={inputMode}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />

      <FieldError id={errorId} message={error} />
    </FieldFrame>
  );
}

type SelectFieldProps = {
  name: VehicleFieldName;
  span: FieldSpan;
  defaultValue: string;
  placeholder: string;
  options: SearchableSelectOption[];
  error?: string;
};

function VehicleSelectField({
  name,
  span,
  defaultValue,
  placeholder,
  options,
  error,
}: SelectFieldProps) {
  const errorId = `${name}-error`;

  return (
    <FieldFrame span={span}>
      <SearchableSelect
        name={name}
        label={vehicleLabels[name]}
        options={options}
        defaultValue={defaultValue}
        placeholder={placeholder}
        normalizeQuery={normalizeVehicleSearchText}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
      />

      <FieldError id={errorId} message={error} />
    </FieldFrame>
  );
}

export function buildModelOptions(models: VehicleModel[]): SearchableSelectOption[] {
  return models.map((model) => {
    const text = `${model.brand.name} — ${model.name}${model.isActive ? "" : " (غیرفعال)"}`;
    return { value: String(model.id), label: text, searchText: `${model.brand.name} ${model.name}`, content: <span>{text}</span> };
  });
}

function buildStatusOptions(statuses: CatalogEntry[]): SearchableSelectOption[] {
  return statuses.map((status) => ({
    value: String(status.id), label: status.name, searchText: status.name, content: <span>{status.name}</span>,
  }));
}

type PlatePartName = keyof typeof vehiclePlatePartCaptions;

type PlatePartProps = {
  name: PlatePartName;
  defaultValue: string;
  error?: string;
  direction?: "ltr" | "rtl";
};

function PlatePartInput({
  name,
  defaultValue,
  error,
  direction = "ltr",
}: PlatePartProps) {
  return (
    <div className={styles.platePartField}>
      <span className={styles.platePartCaption} aria-hidden="true">
        {vehiclePlatePartCaptions[name]}
      </span>

      <input
        className={`${formControlClassName} ${styles.platePartInput}`}
        id={name}
        name={name}
        type="text"
        dir={direction}
        defaultValue={defaultValue}
        aria-label={vehicleLabels[name]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
    </div>
  );
}

const platePartNames = [
  "plateNoLeftSide",
  "plateNoCenterChar",
  "plateNoRightSide",
  "plateNoIranNo",
] as const;

type CreateVehicleFormProps = {
  models: VehicleModel[];
  statuses: CatalogEntry[];
};

export function CreateVehicleForm({
  models,
  statuses,
}: CreateVehicleFormProps) {
  const [state, formAction, isPending] = useActionState(
    createVehicleAction,
    {},
  );

  const errors: VehicleFieldErrors = {};

  if (state.error?.type === "VALIDATION_ERROR") {
    for (const field of Object.keys(
      state.error.fieldErrors,
    ) as VehicleFieldName[]) {
      const code = state.error.fieldErrors[field];

      if (code) {
        errors[field] = vehicleValidationMessages[code];
      }
    }
  } else if (state.error) {
    const failure = vehicleFailureMessages[state.error.type];
    errors[failure.field] = failure.message;
  }

  const valueOf = (name: keyof VehicleFormValues) => state.values?.[name] ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const modelOptions = useMemo(() => buildModelOptions(models), [models]);
  const statusOptions = useMemo(() => buildStatusOptions(statuses), [statuses]);

  return (
    <form
      action={formAction}
      className={styles.form}
      aria-busy={isPending}
      noValidate
    >
      {(state.error || state.formError) && (
        <InlineNotice tone="danger" role="alert">
          {state.formError
            ? "ثبت خودرو انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید."
            : "اطلاعات مشخص‌شده را اصلاح کنید."}
        </InlineNotice>
      )}

      <fieldset className={styles.section} disabled={isPending}>
        <legend className={styles.sectionTitle}>اطلاعات اصلی</legend>

        <FormGrid columns={12}>
          <VehicleTextField
            name="vehicleCode"
            span={3}
            defaultValue={valueOf("vehicleCode")}
            error={errors.vehicleCode}
          />

          <VehicleSelectField
            name="modelId"
            span={4}
            defaultValue={valueOf("modelId")}
            placeholder="انتخاب مدل"
            options={modelOptions}
            error={errors.modelId}
          />

          <VehicleSelectField
            name="vehicleStatusId"
            span={3}
            defaultValue={valueOf("vehicleStatusId")}
            placeholder="انتخاب وضعیت"
            options={statusOptions}
            error={errors.vehicleStatusId}
          />
          <VehicleTextField
            name="modelYear"
            span={2}
            defaultValue={valueOf("modelYear")}
            error={errors.modelYear}
            inputMode="numeric"
            placeholder="۱۴۰۲"
          />
        </FormGrid>
      </fieldset>

      <fieldset className={styles.section} disabled={isPending}>
        <legend className={styles.sectionTitle}>پلاک و شناسه‌ها</legend>

        <FormGrid columns={12}>
          <div className={`${styles.plateGroup} ${styles.span6}`}>
            <span className={styles.plateGroupTitle}>پلاک داخلی</span>

            <div className={styles.plateInputs} dir="ltr">
              <PlatePartInput
                name="plateNoLeftSide"
                defaultValue={valueOf("plateNoLeftSide")}
                error={errors.plateNoLeftSide}
              />

              <PlatePartInput
                name="plateNoCenterChar"
                defaultValue={valueOf("plateNoCenterChar")}
                error={errors.plateNoCenterChar}
                direction="rtl"
              />

              <PlatePartInput
                name="plateNoRightSide"
                defaultValue={valueOf("plateNoRightSide")}
                error={errors.plateNoRightSide}
              />

              <PlatePartInput
                name="plateNoIranNo"
                defaultValue={valueOf("plateNoIranNo")}
                error={errors.plateNoIranNo}
              />
            </div>

            <div className={styles.plateErrors}>
              {platePartNames.map((name) => (
                <FieldError
                  key={name}
                  id={`${name}-error`}
                  message={errors[name]}
                />
              ))}
            </div>
          </div>

          <div className={`${styles.identifierGroup} ${styles.span6}`}>
            <FieldLabel htmlFor="internationalPlateNo">
              {vehicleLabels.internationalPlateNo}
            </FieldLabel>

            <div className={styles.identifierControl}>
              <input
                className={formControlClassName}
                id="internationalPlateNo"
                name="internationalPlateNo"
                type="text"
                dir="ltr"
                defaultValue={valueOf("internationalPlateNo")}
                aria-invalid={Boolean(errors.internationalPlateNo)}
                aria-describedby={
                  errors.internationalPlateNo
                    ? "internationalPlateNo-error"
                    : undefined
                }
              />
            </div>

            <FieldError
              id="internationalPlateNo-error"
              message={errors.internationalPlateNo}
            />
          </div>

          <VehicleTextField
            name="vin"
            span={4}
            defaultValue={valueOf("vin")}
            error={errors.vin}
          />

          <VehicleTextField
            name="engineNo"
            span={4}
            defaultValue={valueOf("engineNo")}
            error={errors.engineNo}
          />

          <VehicleTextField
            name="chassisNo"
            span={4}
            defaultValue={valueOf("chassisNo")}
            error={errors.chassisNo}
          />
        </FormGrid>
      </fieldset>

      <fieldset className={styles.section} disabled={isPending}>
        <legend className={styles.sectionTitle}>اطلاعات خرید و کارکرد</legend>

        <p className={styles.sectionHint}>
          این اطلاعات اختیاری است. برای اعشار از نقطه استفاده کنید.
        </p>

        <FormGrid columns={12}>
          <FieldFrame span={3}>
            <JalaliDatePicker
              name="purchaseDate"
              label={vehicleLabels.purchaseDate}
              defaultValue={valueOf("purchaseDate")}
              maxDate={today}
              invalid={Boolean(errors.purchaseDate)}
              describedBy={
                errors.purchaseDate ? "purchaseDate-error" : undefined
              }
              disabled={isPending}
            />

            <FieldError id="purchaseDate-error" message={errors.purchaseDate} />
          </FieldFrame>

          <FieldFrame span={3}>
            <MoneyInput
              id="purchasePrice"
              name="purchasePrice"
              label={vehicleLabels.purchasePrice}
              defaultValue={valueOf("purchasePrice")}
              invalid={Boolean(errors.purchasePrice)}
              describedBy={
                errors.purchasePrice ? "purchasePrice-error" : undefined
              }
              disabled={isPending}
            />

            <FieldError
              id="purchasePrice-error"
              message={errors.purchasePrice}
            />
          </FieldFrame>

          <VehicleTextField
            name="currentOdometer"
            span={3}
            defaultValue={valueOf("currentOdometer")}
            error={errors.currentOdometer}
            inputMode="decimal"
          />

          <VehicleTextField
            name="currentEngineHour"
            span={3}
            defaultValue={valueOf("currentEngineHour")}
            error={errors.currentEngineHour}
            inputMode="decimal"
          />
        </FormGrid>
      </fieldset>

      {isPending && <LoadingIndicator label="در حال ثبت اطلاعات…" />}

      <FormActions>
        <ActionButton type="submit" disabled={isPending} pending={isPending}>
          {isPending ? "در حال ثبت…" : "ثبت خودرو"}
        </ActionButton>

        <ActionLink href="/fleet/vehicles" variant="quiet">
          بازگشت به خودروها
        </ActionLink>
      </FormActions>
    </form>
  );
}
