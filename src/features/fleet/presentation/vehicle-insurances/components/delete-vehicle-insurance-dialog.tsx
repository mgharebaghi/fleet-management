"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import type { ConfirmDialogIdentityLine } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import type { VehicleInsuranceSummary } from "../../../application/vehicle-insurances/vehicle-insurance";
import { VehiclePlate } from "../../vehicles/list-vehicles/vehicle-plate";
import { deleteVehicleInsuranceAction } from "./delete-vehicle-insurance.action";
import { initialDeleteVehicleInsuranceActionState } from "./delete-vehicle-insurance.action-state";
import { getDeleteVehicleInsuranceStatusMessage } from "./delete-vehicle-insurance.messages";

/** The identity a policy is recognised by: its type and the vehicle it covers. */
export type DeletableVehicleInsurance = Pick<
  VehicleInsuranceSummary,
  | "vehicleInsuranceId"
  | "insuranceType"
  | "insuranceCompany"
  | "policyNo"
  | "vehicle"
>;

export type DeleteVehicleInsuranceDialogProps = {
  open: boolean;
  onClose: () => void;
  insurance: DeletableVehicleInsurance;
};

export function DeleteVehicleInsuranceDialog({
  open,
  onClose,
  insurance,
}: DeleteVehicleInsuranceDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    deleteVehicleInsuranceAction,
    initialDeleteVehicleInsuranceActionState,
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

  const statusMessage = getDeleteVehicleInsuranceStatusMessage(actionState);
  const vehicleName = `${insurance.vehicle.brandName} ${insurance.vehicle.modelName}`;

  const identityLines: ConfirmDialogIdentityLine[] = [
    { label: "خودرو", value: vehicleName },
    { label: "پلاک", value: <VehiclePlate vehicle={insurance.vehicle} /> },
  ];
  if (insurance.insuranceCompany) {
    identityLines.push({
      label: "بیمه‌گر",
      value: insurance.insuranceCompany,
    });
  }
  if (insurance.policyNo) {
    identityLines.push({
      label: "شماره بیمه‌نامه",
      value: <TechnicalValue>{insurance.policyNo}</TechnicalValue>,
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      titleId={`delete-vehicle-insurance-${insurance.vehicleInsuranceId}-title`}
      title="حذف بیمه خودرو"
      recordName={`${insurance.insuranceType} — ${vehicleName}`}
      identityLines={identityLines}
      message={`آیا از حذف «${insurance.insuranceType}» این خودرو مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`}
    >
      <form action={formAction} aria-busy={isPending} noValidate>
        <input
          type="hidden"
          name="vehicleInsuranceId"
          value={insurance.vehicleInsuranceId}
        />

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
            {isPending ? "در حال حذف…" : "حذف بیمه"}
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
