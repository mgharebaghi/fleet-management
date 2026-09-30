"use client";

import { VehicleDetailsFields } from "../components/vehicle-details-fields";

import { useActionState, useMemo } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";

import { FormActions } from "../../../../../components/ui/form-field/form-field";

import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";

import type { CatalogEntry } from "../../../application/catalogs/catalog-entry";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { NewVehicle } from "../../../application/vehicles/vehicle";
import { buildModelOptions, buildStatusOptions } from "../components/vehicle-form-fields";
import { createVehicleAction } from "./create-vehicle.action";
import type { VehicleFormValues } from "../components/vehicle-form-data";
import { vehicleFailureMessages, vehicleValidationMessages } from "../components/vehicle-form-messages";
import styles from "../components/vehicle-form.module.css";

export { buildModelOptions } from "../components/vehicle-form-fields";

type VehicleFieldName = keyof NewVehicle;

type VehicleFieldErrors = Partial<Record<VehicleFieldName, string>>;

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

      <VehicleDetailsFields valueOf={valueOf} errors={errors} modelOptions={modelOptions} statusOptions={statusOptions} today={today} isPending={isPending} />

      {isPending && <LoadingIndicator label="در حال ثبت اطلاعات…" />}

      <FormActions>
        <ActionButton type="submit" disabled={isPending} pending={isPending}>
          {isPending ? "در حال ثبت…" : "ثبت خودرو"}
        </ActionButton>
      </FormActions>
    </form>
  );
}
