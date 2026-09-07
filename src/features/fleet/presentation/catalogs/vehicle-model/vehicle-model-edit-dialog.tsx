"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
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
import { normalizeVehicleSearchText } from "../../../application/vehicles/vehicle-text";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { CatalogEntryView } from "../components/catalog-entry-view";
import { buildReferenceOptions } from "./vehicle-model-create-dialog";
import type { UpdateVehicleModelActionState } from "./update-vehicle-model.action-state";
import { initialUpdateVehicleModelActionState } from "./update-vehicle-model.action-state";
import {
  getUpdateVehicleModelFieldErrors,
  getUpdateVehicleModelStatusMessage,
} from "./update-vehicle-model.messages";
import styles from "./vehicle-model-create-dialog.module.css";

type UpdateVehicleModelAction = (
  previousState: UpdateVehicleModelActionState,
  formData: FormData,
) => Promise<UpdateVehicleModelActionState>;

export type VehicleModelEditDialogProps = {
  open: boolean;
  onClose: () => void;
  vehicleModel: VehicleModel;
  brands: CatalogEntryView[];
  vehicleTypes: CatalogEntryView[];
  fuelTypes: CatalogEntryView[];
  hasReferenceLoadError: boolean;
  action: UpdateVehicleModelAction;
};

export function VehicleModelEditDialog({
  open,
  onClose,
  vehicleModel,
  brands,
  vehicleTypes,
  fuelTypes,
  hasReferenceLoadError,
  action,
}: VehicleModelEditDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    action,
    initialUpdateVehicleModelActionState,
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current && actionState.status === "idle") {
      wasPendingRef.current = false;
      onClose();
    }
  }, [isPending, actionState, onClose]);

  const fieldErrors = getUpdateVehicleModelFieldErrors(actionState);
  const statusMessage = getUpdateVehicleModelStatusMessage(actionState);
  const submissionDisabled = isPending || hasReferenceLoadError;
  const nameErrorId = "vehicle-model-edit-name-error";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="vehicle-model-edit-title"
      title="ویرایش مدل خودرو"
      description="نام مدل و اطلاعات پایه مرتبط با آن را به‌روزرسانی کنید."
    >
      <form
        id="vehicle-model-edit-form"
        action={formAction}
        className={styles.form}
        aria-busy={isPending}
        noValidate
      >
        <input type="hidden" name="id" value={vehicleModel.id} />

        {hasReferenceLoadError && (
          <InlineNotice tone="danger" role="alert">
            دریافت گزینه‌های فرم امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.
          </InlineNotice>
        )}

        <FormField>
          <FieldLabel htmlFor="vehicle-model-edit-name">نام مدل</FieldLabel>
          <input
            className={formControlClassName}
            id="vehicle-model-edit-name"
            name="name"
            type="text"
            required
            autoFocus
            defaultValue={vehicleModel.name}
            disabled={submissionDisabled}
            aria-invalid={fieldErrors.name.length > 0}
            aria-describedby={
              fieldErrors.name.length > 0 ? nameErrorId : undefined
            }
          />
          <FieldErrors id={nameErrorId} messages={fieldErrors.name} />
        </FormField>

        <FormGrid>
          <FormField>
            <SearchableSelect
              name="brandId"
              label="برند"
              options={buildReferenceOptions(brands)}
              defaultValue={String(vehicleModel.brand.id)}
              placeholder="انتخاب کنید"
              normalizeQuery={normalizeVehicleSearchText}
              disabled={submissionDisabled}
              invalid={fieldErrors.brandId.length > 0}
            />
            <FieldErrors messages={fieldErrors.brandId} id="brandId-edit-error" />
          </FormField>
          <FormField>
            <SearchableSelect
              name="vehicleTypeId"
              label="نوع خودرو"
              options={buildReferenceOptions(vehicleTypes)}
              defaultValue={
                vehicleModel.vehicleType ? String(vehicleModel.vehicleType.id) : ""
              }
              placeholder="انتخاب کنید"
              normalizeQuery={normalizeVehicleSearchText}
              disabled={submissionDisabled}
              invalid={fieldErrors.vehicleTypeId.length > 0}
            />
            <FieldErrors
              messages={fieldErrors.vehicleTypeId}
              id="vehicleTypeId-edit-error"
            />
          </FormField>
          <FormField>
            <SearchableSelect
              name="fuelTypeId"
              label="نوع سوخت"
              options={buildReferenceOptions(fuelTypes)}
              defaultValue={
                vehicleModel.fuelType ? String(vehicleModel.fuelType.id) : ""
              }
              placeholder="انتخاب کنید"
              normalizeQuery={normalizeVehicleSearchText}
              disabled={submissionDisabled}
              invalid={fieldErrors.fuelTypeId.length > 0}
            />
            <FieldErrors
              messages={fieldErrors.fuelTypeId}
              id="fuelTypeId-edit-error"
            />
          </FormField>
        </FormGrid>

        <FormField>
          <label className={styles.checkboxRow} htmlFor="vehicle-model-edit-active">
            <input
              id="vehicle-model-edit-active"
              name="isActive"
              type="checkbox"
              defaultChecked={vehicleModel.isActive}
              disabled={submissionDisabled}
            />
            فعال
          </label>
        </FormField>

        {isPending && <LoadingIndicator label="در حال ذخیره…" />}
        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage}
          </InlineNotice>
        )}

        <FormActions separated>
          <ConfirmedSubmitButton
            formId="vehicle-model-edit-form"
            titleId="vehicle-model-edit-confirm-title"
            dialogTitle="ذخیره تغییرات"
            recordName={vehicleModel.name}
            identityLines={[
              { label: "برند", value: vehicleModel.brand.name },
              { label: "دستهٔ اطلاعات پایه", value: "مدل خودرو" },
            ]}
            message="آیا از ذخیره تغییرات این مدل خودرو مطمئن هستید؟"
            label="ذخیره تغییرات"
            pendingLabel="در حال ذخیره…"
            confirmLabel="تأیید و ذخیره"
            pending={isPending}
            disabled={submissionDisabled}
            size="sm"
          />
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
