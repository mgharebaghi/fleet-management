"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../../components/ui/dialog/dialog";
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
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import type { SearchableSelectOption } from "../../../../../components/ui/searchable-select/searchable-select-options";
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
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
  name: "brandId" | "vehicleTypeId" | "fuelTypeId";
  label: string;
  placeholder: string;
  options: CatalogEntryView[];
  disabled: boolean;
  errors: string[];
};

/** Turns a flat catalog list into searchable-select options: name plus an inactive suffix. */
export function buildReferenceOptions(options: CatalogEntryView[]): SearchableSelectOption[] {
  return options.map((option) => {
    const text = `${option.name}${option.isActive === false ? " (غیرفعال)" : ""}`;
    return { value: String(option.id), label: text, searchText: option.name, content: <span>{text}</span> };
  });
}

function ReferenceSelect({
  name,
  label,
  placeholder,
  options,
  disabled,
  errors,
}: ReferenceSelectProps) {
  const errorId = `${name}-error`;

  return (
    <FormField>
      <SearchableSelect
        name={name}
        label={label}
        options={buildReferenceOptions(options)}
        defaultValue=""
        placeholder={placeholder}
        normalizeQuery={normalizeVehicleSearchText}
        disabled={disabled}
        invalid={errors.length > 0}
        describedBy={errors.length > 0 ? errorId : undefined}
      />
      <FieldErrors id={errorId} messages={errors} />
    </FormField>
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
          <InlineNotice tone="danger" role="alert">
            دریافت گزینه‌های فرم امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.
          </InlineNotice>
        )}
        {hasNoBrands && (
          <InlineNotice tone="info" role="status">
            برای ایجاد مدل خودرو، ابتدا یک برند ثبت کنید.
          </InlineNotice>
        )}

        <FormField>
          <FieldLabel htmlFor="vehicle-model-name">نام مدل</FieldLabel>
          <input
            className={formControlClassName}
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
          <FieldErrors id={nameErrorId} messages={fieldErrors.name} />
        </FormField>

        <FormGrid>
          <ReferenceSelect
            name="brandId"
            label="برند"
            placeholder="انتخاب کنید"
            options={brands}
            disabled={submissionDisabled}
            errors={fieldErrors.brandId}
          />
          <ReferenceSelect
            name="vehicleTypeId"
            label="نوع خودرو"
            placeholder="انتخاب کنید"
            options={vehicleTypes}
            disabled={submissionDisabled}
            errors={fieldErrors.vehicleTypeId}
          />
          <ReferenceSelect
            name="fuelTypeId"
            label="نوع سوخت"
            placeholder="انتخاب کنید"
            options={fuelTypes}
            disabled={submissionDisabled}
            errors={fieldErrors.fuelTypeId}
          />
        </FormGrid>

        {isPending && <LoadingIndicator label="در حال ایجاد مدل…" />}
        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage}
          </InlineNotice>
        )}

        <FormActions separated>
          <ActionButton
            type="submit"
            size="sm"
            disabled={submissionDisabled}
            pending={isPending}
          >
            {isPending ? "در حال ایجاد…" : "ایجاد مدل"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            انصراف
          </ActionButton>
        </FormActions>
      </form>
    </Dialog>
  );
}
