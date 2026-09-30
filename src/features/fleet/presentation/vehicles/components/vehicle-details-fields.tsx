"use client";
import { PlatePartInput, platePartNames } from "./vehicle-plate-input";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import { FieldLabel, formControlClassName } from "../../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { MoneyInput } from "../../../../../components/ui/money-input/money-input";
import type { NewVehicle } from "../../../application/vehicles/vehicle";
import { FieldError, FieldFrame, VehicleSelectField, VehicleTextField, buildModelOptions, buildStatusOptions } from "./vehicle-form-fields";
import type { VehicleFormValues } from "./vehicle-form-data";
import { vehicleLabels } from "./vehicle-form-messages";
import styles from "./vehicle-form.module.css";

type VehicleFieldErrors = Partial<Record<keyof NewVehicle, string>>;

export function VehicleDetailsFields({ valueOf, errors, modelOptions, statusOptions, today, isPending }: {
  valueOf: (name: keyof VehicleFormValues) => string;
  errors: VehicleFieldErrors;
  modelOptions: ReturnType<typeof buildModelOptions>;
  statusOptions: ReturnType<typeof buildStatusOptions>;
  today: string;
  isPending: boolean;
}) {
  return (
    <>
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
    </>
  );
}
