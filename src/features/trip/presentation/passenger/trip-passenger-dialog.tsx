"use client";

import { useActionState, useEffect, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { Dialog } from "@/components/ui/dialog/dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { executionHasStarted } from "../../application/trip-lifecycle";
import type {
  TripLocationReference,
  TripPassengerRecord,
  TripPersonReference,
} from "../../application/trip-records";
import { PassengerEditor } from "../create-request/passenger-editor";
import {
  tehranDateTimeInputs,
  tripMessages,
} from "../trip-form-data";
import {
  addTripPassengerAction,
  deleteTripPassengerAction,
  updateTripPassengerAction,
} from "../trip.actions";
import styles from "../trip-forms.module.css";

function TripPassengerForm({
  tripRequestId,
  passenger = null,
  people,
  locations,
  commonOriginId,
  commonDestinationId,
  onClose,
}: {
  tripRequestId: number;
  passenger?: TripPassengerRecord | null;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  commonOriginId?: number;
  commonDestinationId?: number;
  onClose: () => void;
}) {
  const isEditing = Boolean(passenger);
  const action =
    isEditing && passenger
      ? updateTripPassengerAction.bind(null, tripRequestId, passenger.tripId)
      : addTripPassengerAction.bind(null, tripRequestId);

  const [state, formAction, pending] = useActionState(action, {});
  const prefix = useId();

  const pickup = passenger
    ? tehranDateTimeInputs(passenger.requestedPickupDateTime)
    : { day: "", time: "" };

  const initialValues: Record<string, string> = passenger
    ? {
        "passenger.0.personId": String(passenger.passengerPersonId),
        "passenger.0.originLocationId": String(passenger.originLocationId),
        "passenger.0.destinationLocationId": String(
          passenger.destinationLocationId,
        ),
        "passenger.0.pickupDay": pickup.day,
        "passenger.0.pickupTime": pickup.time,
        "passenger.0.pickupOrder":
          passenger.pickupOrder != null ? String(passenger.pickupOrder) : "",
        "passenger.0.dropoffOrder":
          passenger.dropoffOrder != null ? String(passenger.dropoffOrder) : "",
        "passenger.0.description": passenger.description ?? "",
      }
    : {
        ...(commonOriginId
          ? { "passenger.0.originLocationId": String(commonOriginId) }
          : {}),
        ...(commonDestinationId
          ? {
              "passenger.0.destinationLocationId": String(
                commonDestinationId,
              ),
            }
          : {}),
      };

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  const value = (name: string) =>
    state.values?.[name] ?? initialValues[name] ?? "";
  const fieldInvalid = (name: string) => state.field === name;

  return (
    <form
      action={formAction}
      noValidate
      className={styles.workspaceForm}
      aria-busy={pending}
    >
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error as keyof typeof tripMessages] ??
            "خطا در ثبت اطلاعات مسافر"}
        </InlineNotice>
      )}

      <PassengerEditor
        index={0}
        prefix={prefix}
        pending={pending}
        people={people}
        locations={locations}
        passengerCount={2}
        shareOrigin={false}
        shareDestination={false}
        value={value}
        fieldInvalid={fieldInvalid}
      />

      <FormActions separated>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={onClose}
        >
          انصراف
        </ActionButton>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {isEditing ? "ذخیره تغییرات" : "افزودن مسافر"}
        </ActionButton>
      </FormActions>
    </form>
  );
}

export function TripPassengerDialog({
  tripRequestId,
  open,
  onClose,
  passenger = null,
  people,
  locations,
  commonOriginId,
  commonDestinationId,
}: {
  tripRequestId: number;
  open: boolean;
  onClose: () => void;
  passenger?: TripPassengerRecord | null;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  commonOriginId?: number;
  commonDestinationId?: number;
}) {
  const isEditing = Boolean(passenger);
  const prefix = useId();
  const titleId = `${prefix}-passenger-dialog-title`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={isEditing ? "ویرایش اطلاعات مسافر" : "افزودن مسافر به درخواست"}
    >
      {open && (
        <TripPassengerForm
          key={passenger?.tripId ?? "new"}
          tripRequestId={tripRequestId}
          passenger={passenger}
          people={people}
          locations={locations}
          commonOriginId={commonOriginId}
          commonDestinationId={commonDestinationId}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

export function AddPassengerButton({
  tripRequestId,
  people,
  locations,
  commonOriginId,
  commonDestinationId,
}: {
  tripRequestId: number;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  commonOriginId?: number;
  commonDestinationId?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton type="button" size="sm" onClick={() => setOpen(true)}>
        + افزودن مسافر
      </ActionButton>
      <TripPassengerDialog
        tripRequestId={tripRequestId}
        open={open}
        onClose={() => setOpen(false)}
        people={people}
        locations={locations}
        commonOriginId={commonOriginId}
        commonDestinationId={commonDestinationId}
      />
    </>
  );
}

export function EditPassengerButton({
  tripRequestId,
  passenger,
  people,
  locations,
}: {
  tripRequestId: number;
  passenger: TripPassengerRecord;
  people: TripPersonReference[];
  locations: TripLocationReference[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        ویرایش
      </ActionButton>
      <TripPassengerDialog
        tripRequestId={tripRequestId}
        open={open}
        onClose={() => setOpen(false)}
        passenger={passenger}
        people={people}
        locations={locations}
      />
    </>
  );
}

export function DeletePassengerButton({
  tripRequestId,
  trip,
  disabled,
}: {
  tripRequestId: number;
  trip: TripPassengerRecord;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const prefix = useId();
  const titleId = `${prefix}-delete-passenger-title`;
  const [state, formAction, pending] = useActionState(
    deleteTripPassengerAction.bind(null, tripRequestId, trip.tripId),
    {},
  );

  const hasHistory = trip.executions.some(
    (e) =>
      executionHasStarted(e) ||
      e.status === "Completed" ||
      e.actualDropoffDateTime !== null,
  );

  return (
    <>
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || hasHistory}
        onClick={() => setOpen(true)}
      >
        حذف
      </ActionButton>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title="حذف مسافر"
        recordName={`${trip.passenger.firstName} ${trip.passenger.lastName}`}
        identityLines={[
          {
            label: "نام مسافر",
            value: `${trip.passenger.firstName} ${trip.passenger.lastName}`,
          },
          {
            label: "مسیر",
            value: `${trip.origin.locationName} ← ${trip.destination.locationName}`,
          },
        ]}
        message="آیا از حذف این مسافر از درخواست سفر اطمینان دارید؟ با حذف مسافر، مسیرها و برنامه‌های مرتبط با وی نیز حذف خواهند شد."
        tone="danger"
      >
        <form action={formAction} aria-busy={pending} noValidate>
          {state.error && (
            <InlineNotice tone="danger" role="alert">
              {tripMessages[state.error as keyof typeof tripMessages] ??
                "خطا در حذف مسافر"}
            </InlineNotice>
          )}
          <FormActions separated>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              انصراف
            </ActionButton>
            <ActionButton
              type="submit"
              variant="danger"
              disabled={pending}
              pending={pending}
            >
              حذف مسافر
            </ActionButton>
          </FormActions>
        </form>
      </ConfirmDialog>
    </>
  );
}
