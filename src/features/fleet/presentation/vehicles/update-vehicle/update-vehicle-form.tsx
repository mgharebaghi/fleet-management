"use client";

import { useActionState, useMemo } from "react";

import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
  FormActions,
  formControlClassName,
} from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import type { CatalogEntry } from "../../../application/catalogs/catalog-entry";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { NewVehicle, VehicleDetail } from "../../../application/vehicles/vehicle";
import {
  FieldError,
  FieldFrame,
  VehicleSelectField,
  VehicleTextField,
  buildModelOptions,
  buildStatusOptions,
} from "../components/vehicle-form-fields";
import type { VehicleFormValues } from "../create-vehicle/create-vehicle.form-data";
import {
  vehicleFailureMessages,
  vehicleLabels,
  vehiclePlatePartCaptions,
  vehicleValidationMessages,
} from "../create-vehicle/create-vehicle.messages";
import { updateVehicleAction } from "./update-vehicle.action";
import styles from "../create-vehicle/create-vehicle-form.module.css";

type VehicleFieldName = keyof NewVehicle;

type VehicleFieldErrors = Partial<Record<VehicleFieldName, string>>;

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

function toFormValues(vehicle: VehicleDetail): VehicleFormValues {
  return {
    vehicleCode: vehicle.vehicleCode,
    plateNoLeftSide: vehicle.plateNoLeftSide,
    plateNoCenterChar: vehicle.plateNoCenterChar,
    plateNoRightSide: vehicle.plateNoRightSide,
    plateNoIranNo: vehicle.plateNoIranNo,
    internationalPlateNo: vehicle.internationalPlateNo ?? "",
    vin: vehicle.vin ?? "",
    engineNo: vehicle.engineNo ?? "",
    chassisNo: vehicle.chassisNo ?? "",
    modelId: String(vehicle.modelId),
    vehicleStatusId: String(vehicle.vehicleStatusId),
    modelYear: vehicle.modelYear !== null ? String(vehicle.modelYear) : "",
    purchaseDate: vehicle.purchaseDate
      ? vehicle.purchaseDate.toISOString().slice(0, 10)
      : "",
    purchasePrice: vehicle.purchasePrice ?? "",
    currentOdometer: vehicle.currentOdometer ?? "",
    currentEngineHour: vehicle.currentEngineHour ?? "",
  };
}

type UpdateVehicleFormProps = {
  vehicle: VehicleDetail;
  models: VehicleModel[];
  statuses: CatalogEntry[];
};

export function UpdateVehicleForm({
  vehicle,
  models,
  statuses,
}: UpdateVehicleFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateVehicleAction,
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

  const initialValues = useMemo(() => toFormValues(vehicle), [vehicle]);
  const valueOf = (name: keyof VehicleFormValues) =>
    state.values?.[name] ?? initialValues[name];

  const today = new Date().toISOString().slice(0, 10);
  const modelOptions = useMemo(() => buildModelOptions(models), [models]);
  const statusOptions = useMemo(() => buildStatusOptions(statuses), [statuses]);

  return (
    <form
      id="update-vehicle-form"
      action={formAction}
      className={styles.form}
      aria-busy={isPending}
      noValidate
    >
      <input type="hidden" name="vehicleId" value={vehicle.vehicleId} />

      {(state.error || state.formError) && (
        <InlineNotice tone="danger" role="alert">
          {state.formError === "not_found"
            ? "این خودرو قبلاً حذف شده است."
            : state.formError
              ? "ذخیره تغییرات انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید."
              : "اطلاعات مشخص‌شده را اصلاح کنید."}
        </InlineNotice>
      )}

      <fieldset className={styles.section} disabled={isPending}>
        <legend className={styles.sectionTitle}>اطلاعات اصلی</legend>

        <FormGrid columns={12}>
          <VehicleTextField
            name="vehicleCode"
            label={vehicleLabels.vehicleCode}
            span={3}
            defaultValue={valueOf("vehicleCode")}
            error={errors.vehicleCode}
          />

          <VehicleSelectField
            name="modelId"
            label={vehicleLabels.modelId}
            span={4}
            defaultValue={valueOf("modelId")}
            placeholder="انتخاب مدل"
            options={modelOptions}
            error={errors.modelId}
          />

          <VehicleSelectField
            name="vehicleStatusId"
            label={vehicleLabels.vehicleStatusId}
            span={3}
            defaultValue={valueOf("vehicleStatusId")}
            placeholder="انتخاب وضعیت"
            options={statusOptions}
            error={errors.vehicleStatusId}
          />
          <VehicleTextField
            name="modelYear"
            label={vehicleLabels.modelYear}
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
            label={vehicleLabels.vin}
            span={4}
            defaultValue={valueOf("vin")}
            error={errors.vin}
          />

          <VehicleTextField
            name="engineNo"
            label={vehicleLabels.engineNo}
            span={4}
            defaultValue={valueOf("engineNo")}
            error={errors.engineNo}
          />

          <VehicleTextField
            name="chassisNo"
            label={vehicleLabels.chassisNo}
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
            label={vehicleLabels.currentOdometer}
            span={3}
            defaultValue={valueOf("currentOdometer")}
            error={errors.currentOdometer}
            inputMode="decimal"
          />

          <VehicleTextField
            name="currentEngineHour"
            label={vehicleLabels.currentEngineHour}
            span={3}
            defaultValue={valueOf("currentEngineHour")}
            error={errors.currentEngineHour}
            inputMode="decimal"
          />
        </FormGrid>
      </fieldset>

      {isPending && <LoadingIndicator label="در حال ذخیره تغییرات…" />}

      <FormActions>
        <ConfirmedSubmitButton
          formId="update-vehicle-form"
          titleId="update-vehicle-confirm-title"
          dialogTitle="ذخیره تغییرات"
          recordName={`${vehicle.brand.name} ${vehicle.model.name}`}
          identityLines={[{ label: "کد خودرو", value: vehicle.vehicleCode }]}
          message="آیا از ذخیره تغییرات این خودرو مطمئن هستید؟"
          label="ذخیره تغییرات"
          pendingLabel="در حال ذخیره…"
          confirmLabel="تأیید و ذخیره"
          pending={isPending}
        />
      </FormActions>
    </form>
  );
}
