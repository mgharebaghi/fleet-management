"use client";

import { ActionButton } from "@/components/ui/action-button/action-button";

export function PrintTripVoucherButton() {
  return (
    <ActionButton type="button" onClick={() => window.print()}>
      چاپ قبض سفر
    </ActionButton>
  );
}
