"use client";

import { useState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import type { DeletableVehicle } from "./delete-vehicle-dialog";
import { DeleteVehicleDialog } from "./delete-vehicle-dialog";

/** The page-level delete control on a vehicle's record page. */
export function DeleteVehicleButton({ vehicle }: { vehicle: DeletableVehicle }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton variant="danger" onClick={() => setOpen(true)}>
        حذف خودرو
      </ActionButton>
      <DeleteVehicleDialog
        open={open}
        onClose={() => setOpen(false)}
        vehicle={vehicle}
      />
    </>
  );
}
