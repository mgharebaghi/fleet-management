"use client";

import { useState } from "react";

import { ActionButton } from "../../../../components/ui/action-button/action-button";
import type { DeletePersonDialogProps } from "./delete-person-dialog";
import { DeletePersonDialog } from "./delete-person-dialog";

type DeletePersonButtonProps = Omit<
  DeletePersonDialogProps,
  "open" | "onClose"
>;

/** The page-level delete control on a person's record page. */
export function DeletePersonButton(person: DeletePersonButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton variant="danger" onClick={() => setOpen(true)}>
        حذف شخص
      </ActionButton>
      <DeletePersonDialog
        open={open}
        onClose={() => setOpen(false)}
        {...person}
      />
    </>
  );
}
