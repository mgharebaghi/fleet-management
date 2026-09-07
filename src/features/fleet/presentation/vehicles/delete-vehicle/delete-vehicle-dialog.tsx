"use client";

import { useActionState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import type { ConfirmDialogIdentityLine } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { VehiclePlate } from "../list-vehicles/vehicle-plate";
import { deleteVehicleAction } from "./delete-vehicle.action";
import { initialDeleteVehicleActionState } from "./delete-vehicle.action-state";
import { getDeleteVehicleStatusMessage } from "./delete-vehicle.messages";

/** Everything the confirmation needs to name a vehicle the way a user would. */
export type DeletableVehicle = {
  vehicleId: number;
  vehicleCode: string;
  brand: { name: string };
  model: { name: string };
  plateNoLeftSide: string;
  plateNoCenterChar: string | null;
  plateNoRightSide: string | null;
  plateNoIranNo: string | null;
};

export type DeleteVehicleDialogProps = {
  open: boolean;
  onClose: () => void;
  vehicle: DeletableVehicle;
};

/**
 * Confirms deleting a vehicle by what identifies it on the road — brand,
 * model and plate — with the fleet's own code as a secondary identifier. The
 * database id never appears; it only travels in the hidden field.
 */
export function DeleteVehicleDialog({
  open,
  onClose,
  vehicle,
}: DeleteVehicleDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    deleteVehicleAction,
    initialDeleteVehicleActionState,
  );
  const statusMessage = getDeleteVehicleStatusMessage(actionState);
  const vehicleName = `${vehicle.brand.name} ${vehicle.model.name}`;

  const identityLines: ConfirmDialogIdentityLine[] = [
    { label: "پلاک", value: <VehiclePlate vehicle={vehicle} /> },
    {
      label: "کد خودرو",
      value: <TechnicalValue>{vehicle.vehicleCode}</TechnicalValue>,
    },
  ];

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      titleId="delete-vehicle-title"
      title="حذف خودرو"
      recordName={vehicleName}
      identityLines={identityLines}
      message={`آیا از حذف خودروی «${vehicleName}» مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`}
    >
      <form action={formAction} aria-busy={isPending} noValidate>
        <input type="hidden" name="vehicleId" value={vehicle.vehicleId} />

        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage.text}
          </InlineNotice>
        )}

        <FormActions separated>
          <ActionButton
            type="submit"
            variant="danger"
            size="sm"
            disabled={isPending}
            pending={isPending}
          >
            {isPending ? "در حال حذف…" : "حذف خودرو"}
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
    </ConfirmDialog>
  );
}
