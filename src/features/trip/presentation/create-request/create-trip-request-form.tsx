"use client";

import { useEffect, useId, useInsertionEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { PageHeader } from "@/components/ui/page-header/page-header";
import type {
  TripLocationReference,
  TripPersonReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { tripFormValues, tripMessages, type TripActionState } from "../trip-form-data";
import { LOCATION_CREATED_EVENT } from "../location/location-picker";
import { CreateRequestSummary } from "./create-request-summary";
import {
  DEFAULT_CREATE_REQUEST_PURPOSE,
  createRequestReview,
  createWizardHasDiscardableInput,
  createRequestSummaryPreview,
  defaultTripRequestTypeId,
  dropPassengerSnapshot,
  gapNotice,
  isLocationField,
  mergePassengerSnapshots,
  mergePreservedLocationValues,
  passengerIndexFromField,
  passengerStepGaps,
  preservedLocationValue,
  prunePassengerValues,
  requestStepGaps,
  sharesDestination,
  sharesOrigin,
  wizardErrorNavigation,
  type CreateWizardStep,
  type TripRequestReview,
  type TripRequestSummaryPreview,
} from "./create-wizard";
import { PassengersStep } from "./passengers-step";
import { RequestStep } from "./request-step";
import { ReviewStep } from "./review-step";
import { TripCreateProgress } from "./trip-create-progress";
import styles from "./create-trip.module.css";

type CreateTripRequestFormProps = {
  requestTypes: TripRequestTypeReference[];
  people: TripPersonReference[];
  locations: TripLocationReference[];
};

export function CreateTripRequestForm({ requestTypes, people, locations }: CreateTripRequestFormProps) {
  const router = useRouter();
  const prefix = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const initialTypeId = defaultTripRequestTypeId(requestTypes);
  const [step, setStep] = useState<CreateWizardStep>(1);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [catalogLocations, setCatalogLocations] = useState(locations);
  const [passengerCount, setPassengerCount] = useState(1);
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [formValuesState, setFormValuesState] = useState<Record<string, string>>(() => ({
    purpose: DEFAULT_CREATE_REQUEST_PURPOSE,
    ...(initialTypeId ? { tripRequestTypeId: initialTypeId } : {}),
  }));
  const [passengerSnapshots, setPassengerSnapshots] = useState<Record<number, Record<string, string>>>({});
  const [summaryPreview, setSummaryPreview] = useState<TripRequestSummaryPreview | null>(null);
  const [review, setReview] = useState<TripRequestReview | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState(initialTypeId);
  const [keptLocations, setKeptLocations] = useState<Record<string, string>>({});
  const [typeRestoreNonce, setTypeRestoreNonce] = useState(0);
  const selectedTypeIdRef = useRef(selectedTypeId);
  const [formErrorState, setFormErrorState] = useState<TripActionState>({});
  const [abandonOpen, setAbandonOpen] = useState(false);

  useInsertionEffect(() => {
    selectedTypeIdRef.current = selectedTypeId || "";
  });

  const selectedType = requestTypes.find((type) => String(type.tripRequestTypeId) === selectedTypeId);
  const shareOrigin = sharesOrigin(selectedType?.typeCode);
  const shareDestination = sharesDestination(selectedType?.typeCode);
  const errorFocus = wizardErrorNavigation(formErrorState.error, formErrorState.field, selectedType?.typeCode, formErrorState.failedLocation);

  const value = (name: string) => {
    const passengerIndex = passengerIndexFromField(name);
    if (passengerIndex !== null && passengerSnapshots[passengerIndex]?.[name] !== undefined) {
      return passengerSnapshots[passengerIndex][name];
    }
    if (isLocationField(name)) return preservedLocationValue(keptLocations, formValuesState, name);
    return formValuesState[name] ?? "";
  };
  const fieldInvalid = (name: string) => formErrorState.error ? errorFocus.fields.includes(name) : formErrorState.field === name;
  const fieldErrorId = (name: string) => fieldInvalid(name) ? `${prefix}-${name}-error` : undefined;

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    function handleReset() {
      const next = selectedTypeIdRef.current;
      if (next) {
        setSelectedTypeId(next);
        setTypeRestoreNonce((nonce) => nonce + 1);
      }
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    function addLocation(event: Event) {
      const location = (event as CustomEvent<{ location: TripLocationReference }>).detail.location;
      setCatalogLocations((current) => current.some((item) => item.locationId === location.locationId) ? current : [...current, location]);
    }
    window.addEventListener(LOCATION_CREATED_EVENT, addLocation);
    return () => window.removeEventListener(LOCATION_CREATED_EVENT, addLocation);
  }, []);

  function readValues(count = passengerCount) {
    const form = formRef.current;
    if (!form) return prunePassengerValues(formValuesState, count);
    return prunePassengerValues(
      { ...formValuesState, ...(tripFormValues(new FormData(form)) ?? {}) },
      count,
    );
  }

  function refreshSummary(values = readValues()) {
    setSummaryPreview(createRequestSummaryPreview(values, passengerCount, { requestTypes, locations: catalogLocations }));
  }

  function snapshotActivePassenger() {
    const values = readValues();
    setPassengerSnapshots((current) => mergePassengerSnapshots(current, values, passengerCount));
    setFormValuesState(values);
    return values;
  }

  function leaveWizard() {
    router.push("/trips");
  }

  function requestAbandon() {
    const values = readValues();
    if (
      createWizardHasDiscardableInput({
        step,
        values,
        passengerCount,
        defaultTypeId: initialTypeId,
        defaultPurpose: DEFAULT_CREATE_REQUEST_PURPOSE,
      })
    ) {
      setAbandonOpen(true);
      return;
    }
    leaveWizard();
  }

  function navigateStep(nextStep: CreateWizardStep) {
    setStepNotice(null);
    setStep(nextStep);
  }

  function goToPassengers() {
    const values = readValues();
    if ((values.purpose?.length ?? 0) > 500) {
      setFormValuesState(values);
      setFormErrorState({
        error: "PURPOSE_TOO_LONG",
        field: "purpose",
        values,
      });
      setStepNotice(tripMessages.PURPOSE_TOO_LONG);
      return;
    }
    setFormErrorState({});
    const gaps = requestStepGaps(values, selectedType?.typeCode);
    if (gaps.length) {
      setFormValuesState(values);
      setStepNotice(gapNotice(gaps));
      return;
    }
    setFormValuesState(values);
    refreshSummary(values);
    navigateStep(2);
  }

  function selectPassenger(index: number) {
    if (index === activePassengerIndex) return;
    snapshotActivePassenger();
    setActivePassengerIndex(index);
  }

  function addPassenger() {
    snapshotActivePassenger();
    setPassengerCount((count) => count + 1);
    setActivePassengerIndex(passengerCount);
  }

  function removeLastPassenger() {
    const removedIndex = passengerCount - 1;
    const nextCount = Math.max(1, passengerCount - 1);
    const values = readValues(nextCount);
    setPassengerCount(nextCount);
    setPassengerSnapshots((current) => dropPassengerSnapshot(current, removedIndex));
    setFormValuesState(values);
    setActivePassengerIndex((index) => Math.min(index, Math.max(0, nextCount - 1)));
  }

  function goToReview() {
    const values = snapshotActivePassenger();
    const gaps = passengerStepGaps(values, selectedType?.typeCode);
    if (gaps.length) {
      setStepNotice(gapNotice(gaps));
      const index = passengerIndexFromField(gaps[0]);
      if (index !== null) setActivePassengerIndex(index);
      return;
    }
    const nextReview = createRequestReview(values, { requestTypes, people, locations: catalogLocations });
    setReview(nextReview);
    setFormValuesState(values);
    setStepNotice(null);
    navigateStep(3);
  }

  const completeReview = review ?? createRequestReview(formValuesState, { requestTypes, people, locations: catalogLocations });

  return (
    <>
    <PageHeader
      eyebrow="مدیریت سفر"
      title="ثبت درخواست سفر"
      compactAction
      action={
        <button
          type="button"
          className={styles.wizardAbandon}
          onClick={requestAbandon}
        >
          انصراف
        </button>
      }
    />
    <div className={styles.createShell}>
      <TripCreateProgress currentIndex={step - 1} />
      <form
        ref={formRef}
        noValidate
        hidden={step > 2}
        aria-label="ثبت درخواست سفر"
        className={styles.createSurface}
        onSubmit={(event) => event.preventDefault()}
      >
        <CreateRequestSummary preview={summaryPreview} passengerCount={passengerCount} />
        {stepNotice && <InlineNotice tone="danger" role="alert">{stepNotice}</InlineNotice>}
        <RequestStep
          hidden={step !== 1}
          prefix={prefix}
          pending={false}
          requestTypes={requestTypes}
          locations={catalogLocations}
          selectedTypeId={selectedTypeId}
          typeRestoreNonce={typeRestoreNonce}
          selectedType={selectedType}
          shareOrigin={shareOrigin}
          shareDestination={shareDestination}
          state={formErrorState}
          value={value}
          fieldInvalid={fieldInvalid}
          fieldErrorId={fieldErrorId}
          onTypeChange={(typeId) => {
            const values = readValues();
            setKeptLocations((current) => mergePreservedLocationValues(current, values));
            setSelectedTypeId(typeId);
          }}
          onNext={goToPassengers}
        />
        <PassengersStep
          hidden={step !== 2}
          prefix={prefix}
          pending={false}
          people={people}
          locations={catalogLocations}
          passengerCount={passengerCount}
          activePassengerIndex={activePassengerIndex}
          passengerSnapshots={passengerSnapshots}
          shareOrigin={shareOrigin}
          shareDestination={shareDestination}
          value={value}
          fieldInvalid={fieldInvalid}
          onSelectPassenger={selectPassenger}
          onAddPassenger={addPassenger}
          onRemoveLastPassenger={removeLastPassenger}
          onBack={() => { snapshotActivePassenger(); navigateStep(1); refreshSummary(); }}
          onReview={goToReview}
        />
      </form>

      <ReviewStep
        hidden={step !== 3}
        review={completeReview}
        formValues={formValuesState}
        onBack={() => navigateStep(2)}
      />
    </div>
    <ConfirmDialog
      open={abandonOpen}
      onClose={() => setAbandonOpen(false)}
      titleId={`${prefix}-abandon-title`}
      title="انصراف از ثبت درخواست"
      tone="danger"
      recordName="این درخواست هنوز ثبت نشده است"
      message="اطلاعاتی که وارد کرده‌اید ذخیره نمی‌شود و هیچ درخواست سفری در سامانه ثبت نخواهد شد."
    >
      <FormActions>
        <ActionButton type="button" variant="danger" onClick={leaveWizard}>
          خروج بدون ثبت
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          onClick={() => setAbandonOpen(false)}
        >
          ادامه ثبت
        </ActionButton>
      </FormActions>
    </ConfirmDialog>
    </>
  );
}
