"use client";

import { useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { Dialog } from "@/components/ui/dialog/dialog";
import type { TripPassengerRecord } from "../application/trip-records";
import {
  persistedPlanningExecution,
} from "./trip-execution-current";
import { TripExecutionForm } from "./trip-execution-form";
import { executionStatusLabel } from "./trip-status";
import styles from "./trip-forms.module.css";
import workspaceStyles from "./workspace/trip-workspace.module.css";

export function TripCompletionButton({
  tripRequestId,
  passengers,
  label = "ثبت / ویرایش اطلاعات اجرای مسافران",
  variant = "primary",
}: {
  tripRequestId: number;
  passengers: TripPassengerRecord[];
  label?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton
        type="button"
        variant={variant}
        size="md"
        onClick={() => setOpen(true)}
      >
        {label}
      </ActionButton>
      <TripCompletionDialog
        tripRequestId={tripRequestId}
        open={open}
        onClose={() => setOpen(false)}
        passengers={passengers}
      />
    </>
  );
}

export function TripCompletionDialog({
  tripRequestId,
  open,
  onClose,
  passengers,
}: {
  tripRequestId: number;
  open: boolean;
  onClose: () => void;
  passengers: TripPassengerRecord[];
}) {
  const [selectedTripId, setSelectedTripId] = useState<number>(() => {
    // Default to the first passenger that is not yet completed, or the first passenger
    const incomplete = passengers.find((p) => {
      const active = persistedPlanningExecution(p.executions);
      return active && active.status !== "Completed";
    });
    return incomplete?.tripId ?? passengers[0]?.tripId ?? 0;
  });

  const prefix = useId();
  const titleId = `${prefix}-completion-dialog-title`;

  const currentPassenger =
    passengers.find((p) => p.tripId === selectedTripId) ?? passengers[0];

  const activeExecution = currentPassenger
    ? persistedPlanningExecution(currentPassenger.executions)
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="ثبت / ویرایش اطلاعات اجرای مسافران"
      size="list"
    >
      <div className={workspaceStyles.stack}>
        {passengers.length > 1 && (
          <nav
            className={workspaceStyles.passengerSwitcher}
            aria-label="انتخاب مسافر"
          >
            {passengers.map((p, idx) => {
              const active = persistedPlanningExecution(p.executions);
              const isSelected = p.tripId === selectedTripId;
              const isCompleted = p.executions.some(
                (e) => e.status === "Completed",
              );
              const statusText = isCompleted
                ? "تکمیل‌شده"
                : active
                  ? executionStatusLabel(active.status)
                  : "فاقد تخصیص";

              return (
                <button
                  key={p.tripId}
                  type="button"
                  className={workspaceStyles.passengerTabButton}
                  data-selected={isSelected}
                  onClick={() => setSelectedTripId(p.tripId)}
                  aria-pressed={isSelected}
                >
                  <span className={workspaceStyles.passengerTabNumber}>
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  <span className={workspaceStyles.passengerTabName}>
                    {p.passenger.firstName} {p.passenger.lastName}
                  </span>
                  <span className={workspaceStyles.passengerTabStatus}>
                    ({statusText})
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {currentPassenger &&
          (activeExecution ? (
            <TripExecutionForm
              key={currentPassenger.tripId}
              tripRequestId={tripRequestId}
              trip={currentPassenger}
              execution={activeExecution}
              onCancel={onClose}
            />
          ) : (
            <div className={styles.section}>
              <p className={styles.muted}>
                برای {currentPassenger.passenger.firstName}{" "}
                {currentPassenger.passenger.lastName} هنوز تخصیص خودرو و راننده
                ثبت نشده است. ابتدا در بخش «راننده و خودرو» تخصیص را ثبت کنید.
              </p>
            </div>
          ))}
      </div>
    </Dialog>
  );
}
