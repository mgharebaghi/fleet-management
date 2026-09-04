"use client";

import { useActionState, useEffect, useRef } from "react";

import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import type { CatalogEntryView } from "../components/catalog-entry-view";
import type { CreateVehicleModelActionState } from "./create-vehicle-model.action-state";
import { initialCreateVehicleModelActionState } from "./create-vehicle-model.action-state";
import {
  getCreateVehicleModelFieldErrors,
  getCreateVehicleModelStatusMessage,
} from "./create-vehicle-model.messages";
import styles from "./vehicle-model-create-dialog.module.css";

type CreateVehicleModelAction = (
  previousState: CreateVehicleModelActionState,
  formData: FormData,
) => Promise<CreateVehicleModelActionState>;

export type VehicleModelCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  brands: CatalogEntryView[];
  vehicleTypes: CatalogEntryView[];
  fuelTypes: CatalogEntryView[];
  hasReferenceLoadError: boolean;
  action: CreateVehicleModelAction;
};

type ReferenceSelectProps = {
  id: string;
  name: "brandId" | "vehicleTypeId" | "fuelTypeId";
  label: string;
  placeholder: string;
  options: CatalogEntryView[];
  disabled: boolean;
  errors: string[];
};

function ReferenceSelect({
  id,
  name,
  label,
  placeholder,
  options,
  disabled,
  errors,
}: ReferenceSelectProps) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        defaultValue=""
        required
        disabled={disabled}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length > 0 ? errorId : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
            {option.isActive === false ? " (غیرفعال)" : ""}
          </option>
        ))}
      </select>
      {errors.length > 0 && (
        <div id={errorId} className={styles.fieldErrors} role="alert">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function VehicleModelCreateDialog({
  open,
  onClose,
  brands,
  vehicleTypes,
  fuelTypes,
  hasReferenceLoadError,
  action,
}: VehicleModelCreateDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    action,
    initialCreateVehicleModelActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current && actionState.status === "idle") {
      wasPendingRef.current = false;
      formRef.current?.reset();
      onClose();
    }
  }, [isPending, actionState, onClose]);

  const fieldErrors = getCreateVehicleModelFieldErrors(actionState);
  const statusMessage = getCreateVehicleModelStatusMessage(actionState);
  const hasNoBrands = !hasReferenceLoadError && brands.length === 0;
  const submissionDisabled = isPending || hasReferenceLoadError || hasNoBrands;
  const nameErrorId = "vehicle-model-name-error";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="vehicle-model-create-title"
      title="ایجاد مدل خودرو"
      description="نام مدل و اطلاعات پایه مرتبط با آن را انتخاب کنید."
    >
      <form
        ref={formRef}
        action={formAction}
        className={styles.form}
        aria-busy={isPending}
        noValidate
      >
        {hasReferenceLoadError && (
          <p className={styles.referenceError} role="alert">
            دریافت گزینه‌های فرم امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.
          </p>
        )}
        {hasNoBrands && (
          <p className={styles.referenceNotice} role="status">
            برای ایجاد مدل خودرو، ابتدا یک برند ثبت کنید.
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor="vehicle-model-name">نام مدل</label>
          <input
            id="vehicle-model-name"
            name="name"
            type="text"
            required
            autoFocus
            disabled={submissionDisabled}
            aria-invalid={fieldErrors.name.length > 0}
            aria-describedby={
              fieldErrors.name.length > 0 ? nameErrorId : undefined
            }
          />
          {fieldErrors.name.length > 0 && (
            <div
              id={nameErrorId}
              className={styles.fieldErrors}
              role="alert"
            >
              {fieldErrors.name.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
        </div>

        <div className={styles.referenceGrid}>
          <ReferenceSelect
            id="vehicle-model-brand"
            name="brandId"
            label="برند"
            placeholder="انتخاب کنید"
            options={brands}
            disabled={submissionDisabled}
            errors={fieldErrors.brandId}
          />
          <ReferenceSelect
            id="vehicle-model-type"
            name="vehicleTypeId"
            label="نوع خودرو"
            placeholder="انتخاب کنید"
            options={vehicleTypes}
            disabled={submissionDisabled}
            errors={fieldErrors.vehicleTypeId}
          />
          <ReferenceSelect
            id="vehicle-model-fuel"
            name="fuelTypeId"
            label="نوع سوخت"
            placeholder="انتخاب کنید"
            options={fuelTypes}
            disabled={submissionDisabled}
            errors={fieldErrors.fuelTypeId}
          />
        </div>

        {isPending && <LoadingIndicator label="در حال ایجاد مدل…" />}
        {statusMessage && (
          <p className={styles.formError} role="alert">
            {statusMessage}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submissionDisabled}
          >
            {isPending ? "در حال ایجاد…" : "ایجاد مدل"}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isPending}
          >
            انصراف
          </button>
        </div>
      </form>
    </Dialog>
  );
}
