"use client";

import { useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { Dialog } from "@/components/ui/dialog/dialog";
import { IconActionButton } from "@/components/ui/icon-action-button/icon-action-button";
import { EditIcon } from "@/components/ui/icon/icons";
import type {
  TripLocationReference,
  TripPassengerRecord,
  TripRoute,
} from "../application/trip-records";
import styles from "./trip-forms.module.css";
import { TripRouteForm } from "./trip-route-form";

export function TripRouteDialog({
  tripRequestId,
  passengers,
  locations,
  route,
  tripId,
  triggerLabel,
  triggerVariant = "button",
}: {
  tripRequestId: number;
  passengers: TripPassengerRecord[];
  locations: TripLocationReference[];
  route?: TripRoute | null;
  tripId?: number | null;
  triggerLabel?: string;
  triggerVariant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const isEdit = Boolean(route);

  const defaultLabel = isEdit ? "ویرایش مسیر" : "ثبت مسیر برنامه‌ریزی‌شده";
  const buttonLabel = triggerLabel ?? defaultLabel;

  const defaultDialogTitle = isEdit
    ? "ویرایش مسیر برنامه‌ریزی‌شده"
    : (triggerLabel ?? "ثبت مسیر برنامه‌ریزی‌شده");

  return (
    <>
      {triggerVariant === "icon" ? (
        <IconActionButton
          label={buttonLabel}
          icon={<EditIcon />}
          onClick={() => setOpen(true)}
        />
      ) : (
        <ActionButton type="button" size="sm" onClick={() => setOpen(true)}>
          {buttonLabel}
        </ActionButton>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={defaultDialogTitle}
        description="مسیر برنامه‌ریزی‌شده را در سه مرحله مشخصات، نقاط و مرور ثبت کنید."
        size="wide"
        className={styles.routeDialog}
      >
        <TripRouteForm
          tripRequestId={tripRequestId}
          passengers={passengers}
          locations={locations}
          initialRoute={route}
          targetTripId={tripId}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
