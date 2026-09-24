"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

import { ActionButton } from "@/components/ui/action-button/action-button";
import { Dialog } from "@/components/ui/dialog/dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type { TripPassengerRecord } from "../../application/trip-records";
import { persistedPlanningExecution } from "../trip-execution-current";
import { tripMessages } from "../trip-form-data";
import { savePassengerExecutionsAction } from "../trip.actions";
import { executionStatusLabel } from "../trip-status";
import {
  dropoffBeforePickup,
  initialExecutionDraft,
  readExecutionDraft,
  sameExecutionDraft,
  type PassengerExecutionDraft,
} from "./execution-draft";
import { TripExecutionForm } from "./trip-execution-form";
import styles from "../trip-forms.module.css";
import workspaceStyles from "../workspace/trip-workspace.module.css";

const passengerCount = new Intl.NumberFormat("fa-IR");

function executionBaselines(
  passengers: TripPassengerRecord[],
  preferCompleted: boolean,
) {
  const baselines: Record<number, PassengerExecutionDraft> = {};
  for (const passenger of passengers) {
    const execution = persistedPlanningExecution(passenger.executions);
    if (!execution) continue;
    baselines[passenger.tripId] = initialExecutionDraft(execution, preferCompleted);
  }
  return baselines;
}

function firstIncompleteTripId(passengers: TripPassengerRecord[]) {
  const incomplete = passengers.find((passenger) => {
    const active = persistedPlanningExecution(passenger.executions);
    return active && active.status !== "Completed";
  });
  return incomplete?.tripId ?? passengers[0]?.tripId ?? 0;
}

export function TripCompletionButton({
  tripRequestId,
  passengers,
  label = "ثبت / ویرایش اطلاعات اجرای مسافران",
  variant = "primary",
  preferCompleted = false,
  focusTripId,
  size = "md",
}: {
  tripRequestId: number;
  passengers: TripPassengerRecord[];
  label?: string;
  variant?: "primary" | "secondary" | "danger";
  preferCompleted?: boolean;
  focusTripId?: number;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        {label}
      </ActionButton>
      {open && (
        <TripCompletionDialog
          tripRequestId={tripRequestId}
          open={open}
          onClose={() => setOpen(false)}
          passengers={passengers}
          preferCompleted={preferCompleted}
          initialTripId={focusTripId}
        />
      )}
    </>
  );
}

export function TripCompletionDialog({
  tripRequestId,
  open,
  onClose,
  passengers,
  preferCompleted = false,
  initialTripId,
}: {
  tripRequestId: number;
  open: boolean;
  onClose: () => void;
  passengers: TripPassengerRecord[];
  preferCompleted?: boolean;
  initialTripId?: number;
}) {
  const router = useSafeRouter();
  const prefix = useId();
  const titleId = `${prefix}-completion-dialog-title`;
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedTripId, setSelectedTripId] = useState(
    () => initialTripId ?? firstIncompleteTripId(passengers),
  );
  const [drafts, setDrafts] = useState<Record<number, PassengerExecutionDraft>>(() =>
    open ? executionBaselines(passengers, preferCompleted) : {},
  );
  const [baselines, setBaselines] = useState<Record<number, PassengerExecutionDraft>>(() =>
    open ? executionBaselines(passengers, preferCompleted) : {},
  );
  const [failure, setFailure] = useState<{
    tripId: number;
    message: string;
    field?: string;
    savedBefore: boolean;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  if (open && !wasOpen) {
    const nextBaselines = executionBaselines(passengers, preferCompleted);
    setWasOpen(true);
    setDrafts(nextBaselines);
    setBaselines(nextBaselines);
    setSelectedTripId(firstIncompleteTripId(passengers));
    setFailure(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const currentPassenger =
    passengers.find((passenger) => passenger.tripId === selectedTripId) ??
    passengers[0];
  const activeExecution = currentPassenger
    ? persistedPlanningExecution(currentPassenger.executions)
    : null;
  const currentIndex = Math.max(
    0,
    passengers.findIndex((passenger) => passenger.tripId === currentPassenger?.tripId),
  );
  const completedCount = passengers.filter((passenger) =>
    passenger.executions.some((execution) => execution.status === "Completed"),
  ).length;
  const currentDraft = currentPassenger ? drafts[currentPassenger.tripId] : undefined;
  const currentBaseline = currentPassenger ? baselines[currentPassenger.tripId] : undefined;
  const currentDirty =
    currentDraft !== undefined &&
    currentBaseline !== undefined &&
    !sameExecutionDraft(currentDraft, currentBaseline);

  function rememberCurrentDraft() {
    if (!formRef.current || !currentPassenger) return drafts;
    const next = readExecutionDraft(formRef.current);
    const merged = { ...drafts, [currentPassenger.tripId]: next };
    setDrafts(merged);
    return merged;
  }

  function selectPassenger(tripId: number) {
    rememberCurrentDraft();
    setSelectedTripId(tripId);
  }

  async function saveDrafts() {
    const merged = rememberCurrentDraft();
    const dirtyPassengers = passengers.filter((passenger) => {
      const draft = merged[passenger.tripId];
      const baseline = baselines[passenger.tripId];
      return draft && baseline && !sameExecutionDraft(draft, baseline);
    });

    if (dirtyPassengers.length === 0) {
      setFailure({
        tripId: currentPassenger?.tripId ?? 0,
        message: "تغییری برای ثبت نیست.",
        savedBefore: false,
      });
      return;
    }

    const periodProblem = dirtyPassengers.find((passenger) =>
      dropoffBeforePickup(merged[passenger.tripId]!),
    );
    if (periodProblem) {
      setSelectedTripId(periodProblem.tripId);
      setFailure({
        tripId: periodProblem.tripId,
        message: tripMessages.INVALID_EXECUTION_PERIOD,
        field: "actualDropoffDay",
        savedBefore: false,
      });
      return;
    }

    setPending(true);
    const result = await savePassengerExecutionsAction(
      tripRequestId,
      dirtyPassengers.map((passenger) => ({
        tripId: passenger.tripId,
        tripExecutionId: persistedPlanningExecution(passenger.executions)!.tripExecutionId,
        values: {
          ...merged[passenger.tripId]!,
          assignmentId: String(
            persistedPlanningExecution(passenger.executions)!.assignment.assignmentId,
          ),
        },
      })),
    );
    setPending(false);

    if (result.failed) {
      setSelectedTripId(result.failed.tripId);
      setBaselines((current) => {
        const next = { ...current };
        for (const tripId of result.savedTripIds) {
          if (merged[tripId]) next[tripId] = merged[tripId];
        }
        return next;
      });
      setFailure({
        tripId: result.failed.tripId,
        message:
          (result.failed.error && tripMessages[result.failed.error]) ??
          tripMessages.UNEXPECTED,
        field: result.failed.field,
        savedBefore: result.savedTripIds.length > 0,
      });
      return;
    }

    router?.refresh();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="ثبت / ویرایش اطلاعات اجرای مسافران"
      size="list"
    >
      <div className={workspaceStyles.stack}>
        <p className={styles.executionHelp}>
          مسافر {passengerCount.format(currentIndex + 1)} از{" "}
          {passengerCount.format(passengers.length)}
          {" · "}
          {passengerCount.format(completedCount)} نفر تکمیل‌شده
        </p>
        {passengers.length > 1 && (
          <nav className={workspaceStyles.passengerSwitcher} aria-label="انتخاب مسافر">
            {passengers.map((passenger, index) => {
              const active = persistedPlanningExecution(passenger.executions);
              const isSelected = passenger.tripId === selectedTripId;
              const isCompleted = passenger.executions.some(
                (execution) => execution.status === "Completed",
              );
              const draft = drafts[passenger.tripId];
              const baseline = baselines[passenger.tripId];
              const dirty =
                draft !== undefined &&
                baseline !== undefined &&
                !sameExecutionDraft(draft, baseline);
              const statusText = dirty
                ? "تغییر ذخیره‌نشده"
                : isCompleted
                  ? "تکمیل‌شده"
                  : active
                    ? executionStatusLabel(active.status)
                    : "فاقد تخصیص";

              return (
                <button
                  key={passenger.tripId}
                  type="button"
                  className={workspaceStyles.passengerTabButton}
                  data-selected={isSelected}
                  onClick={() => selectPassenger(passenger.tripId)}
                  aria-pressed={isSelected}
                >
                  <span className={workspaceStyles.passengerTabNumber}>
                    {isCompleted ? "✓" : index + 1}
                  </span>
                  <span className={workspaceStyles.passengerTabName}>
                    {passenger.passenger.firstName} {passenger.passenger.lastName}
                  </span>
                  <span className={workspaceStyles.passengerTabStatus}>
                    ({statusText})
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {failure && failure.tripId === currentPassenger?.tripId && (
          <InlineNotice tone="danger" role="alert">
            {failure.savedBefore
              ? `ثبت این مسافر انجام نشد. مسافرانی که پیش از آن ثبت شده‌اند ذخیره شده‌اند. ${failure.message}`
              : failure.message}
          </InlineNotice>
        )}
        {currentDirty && (
          <p className={styles.executionHelp}>تغییرات این مسافر هنوز ثبت نشده است.</p>
        )}

        {open && currentPassenger &&
          (activeExecution && currentDraft ? (
            <TripExecutionForm
              key={currentPassenger.tripId}
              tripRequestId={tripRequestId}
              trip={currentPassenger}
              execution={activeExecution}
              draft={currentDraft}
              embedded
              formRef={formRef}
              invalidField={
                failure?.tripId === currentPassenger.tripId ? failure.field : null
              }
              externalMessage={
                failure?.tripId === currentPassenger.tripId ? failure.message : null
              }
              onDraftChange={(draft) =>
                setDrafts((current) => ({
                  ...current,
                  [currentPassenger.tripId]: draft,
                }))
              }
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

        <FormActions separated>
          <ActionButton type="button" disabled={pending} pending={pending} onClick={() => void saveDrafts()}>
            {pending ? "در حال ثبت…" : "ثبت اطلاعات مسافران"}
          </ActionButton>
          <ActionButton type="button" variant="secondary" disabled={pending} onClick={onClose}>
            انصراف
          </ActionButton>
        </FormActions>
      </div>
    </Dialog>
  );
}
