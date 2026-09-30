"use client";

import { VehicleDetailsFields } from "../components/vehicle-details-fields";

import { useActionState, useMemo } from "react";

import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";

import { FormActions } from "../../../../../components/ui/form-field/form-field";

import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";

import type { CatalogEntry } from "../../../application/catalogs/catalog-entry";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { NewVehicle, VehicleDetail } from "../../../application/vehicles/vehicle";
import { buildModelOptions, buildStatusOptions } from "../components/vehicle-form-fields";
import type { VehicleFormValues } from "../components/vehicle-form-data";
import { vehicleFailureMessages, vehicleValidationMessages } from "../components/vehicle-form-messages";
import { updateVehicleAction } from "./update-vehicle.action";
import styles from "../components/vehicle-form.module.css";

type VehicleFieldName = keyof NewVehicle;

type VehicleFieldErrors = Partial<Record<VehicleFieldName, string>>;

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

      <VehicleDetailsFields valueOf={valueOf} errors={errors} modelOptions={modelOptions} statusOptions={statusOptions} today={today} isPending={isPending} />

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
