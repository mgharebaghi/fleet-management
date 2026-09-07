"use client";

import { useState } from "react";

import { DeleteIcon, EditIcon } from "../../../../../components/ui/icon/icons";
import {
  IconActionButton,
  IconActionGroup,
  IconActionLink,
} from "../../../../../components/ui/icon-action-button/icon-action-button";
import type { DeletableVehicleInsurance } from "./delete-vehicle-insurance-dialog";
import { DeleteVehicleInsuranceDialog } from "./delete-vehicle-insurance-dialog";

/** The per-row actions on the insurance list: edit and delete a policy. */
export function InsuranceRowActions({
  insurance,
}: {
  insurance: DeletableVehicleInsurance;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const policyName = `${insurance.insuranceType} ${insurance.vehicle.brandName} ${insurance.vehicle.modelName}`;

  return (
    <>
      <IconActionGroup>
        <IconActionLink
          label={`ویرایش ${policyName}`}
          icon={<EditIcon />}
          href={`/fleet/vehicle-insurances/${insurance.vehicleInsuranceId}/edit`}
        />
        <IconActionButton
          label={`حذف ${policyName}`}
          icon={<DeleteIcon />}
          tone="danger"
          onClick={() => setDeleteOpen(true)}
        />
      </IconActionGroup>

      <DeleteVehicleInsuranceDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        insurance={insurance}
      />
    </>
  );
}
