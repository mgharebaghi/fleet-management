"use client";

import { useState, type ReactNode } from "react";
import { ActionButton } from "../../../components/ui/action-button/action-button";
import { Dialog } from "../../../components/ui/dialog/dialog";

type Props = { triggerLabel: string; dialogTitle: string; titleId: string; size?: "form" | "list"; disabled?: boolean; children: ReactNode };

// A remount (driven by a `key` tied to the data the wrapped form creates) is what
// closes this dialog after a successful submit: the action redirects to the same
// page, fresh server data flows in, and the changed key resets `open` to false.
export function DriverFormDialog({ triggerLabel, dialogTitle, titleId, size = "form", disabled = false, children }: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <ActionButton variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>{triggerLabel}</ActionButton>
    {/* A disabled trigger keeps its form out of the page entirely. */}
    {!disabled && <Dialog open={open} onClose={() => setOpen(false)} titleId={titleId} title={dialogTitle} size={size}>{children}</Dialog>}
  </>;
}
