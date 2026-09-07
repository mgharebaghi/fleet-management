"use client";

import { useState } from "react";

import {
  DeleteIcon,
  EditIcon,
  ViewIcon,
} from "../../../../../components/ui/icon/icons";
import {
  IconActionButton,
  IconActionGroup,
  IconActionLink,
} from "../../../../../components/ui/icon-action-button/icon-action-button";
import type { DeletableVehicle } from "../delete-vehicle/delete-vehicle-dialog";
import { DeleteVehicleDialog } from "../delete-vehicle/delete-vehicle-dialog";

/** The per-row actions on the vehicles list: open, edit and delete a vehicle. */
export function VehicleRowActions({ vehicle }: { vehicle: DeletableVehicle }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const vehicleName = `${vehicle.brand.name} ${vehicle.model.name}`;

  return (
    <>
      <IconActionGroup>
        <IconActionLink
          label={`مشاهده پروندهٔ ${vehicleName}`}
          icon={<ViewIcon />}
          href={`/fleet/vehicles/${vehicle.vehicleId}`}
        />
        <IconActionLink
          label={`ویرایش ${vehicleName}`}
          icon={<EditIcon />}
          href={`/fleet/vehicles/${vehicle.vehicleId}/edit`}
        />
        <IconActionButton
          label={`حذف ${vehicleName}`}
          icon={<DeleteIcon />}
          tone="danger"
          onClick={() => setDeleteOpen(true)}
        />
      </IconActionGroup>

      <DeleteVehicleDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        vehicle={vehicle}
      />
    </>
  );
}
