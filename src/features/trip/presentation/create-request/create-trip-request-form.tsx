"use client";

import {
  useActionState,
  useEffect,
  useId,
  useInsertionEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import type {
  TripLocationReference,
  TripPersonReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { createTripRequestAction } from "../trip.actions";
import { tripFormValues, tripMessages } from "../trip-form-data";
import { LOCATION_CREATED_EVENT } from "../location/location-picker";
import styles from "../trip-forms.module.css";
import {
  createRequestReview,
  gapNotice,
  isLocationField,
  mergePreservedLocationValues,
  passengerStepGaps,
  preservedLocationValue,
  requestStepGaps,
  sharesDestination,
  sharesOrigin,
  shouldSubmitCreateForm,
  wizardErrorNavigation,
  wizardStepForField,
  type CreateWizardStep,
  type TripRequestReview,
} from "./create-wizard";
import { PassengersStep } from "./passengers-step";
import { RequestStep } from "./request-step";
import { TripCreateProgress } from "./trip-create-progress";
import { TripRequestReviewDialog } from "./trip-request-review-dialog";

type CreateTripRequestFormProps = {
  requestTypes: TripRequestTypeReference[];
  people: TripPersonReference[];
  locations: TripLocationReference[];
};

export function CreateTripRequestForm({
  requestTypes,
  people,
  locations,
}: CreateTripRequestFormProps) {
  const [state, formAction, pending] = useActionState(
    createTripRequestAction,
    {},
  );
  const prefix = useId();
  const formId = `${prefix}-form`;
  const reviewTitleId = `${prefix}-review-title`;
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<CreateWizardStep>(() =>
    wizardStepForField(state.field, state.error),
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState<TripRequestReview | null>(null);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [catalogLocations, setCatalogLocations] = useState(locations);
  const [passengerCount, setPassengerCount] = useState(
    Math.max(1, Number(state.values?.passengerCount ?? 1) || 1),
  );
  const [selectedTypeId, setSelectedTypeId] = useState(
    state.values?.tripRequestTypeId ?? "",
  );
  const [keptLocations, setKeptLocations] = useState(() =>
    mergePreservedLocationValues({}, state.values ?? {}),
  );
  const [typeRestoreNonce, setTypeRestoreNonce] = useState(0);
  const selectedTypeIdRef = useRef(selectedTypeId);
  useInsertionEffect(() => {
    selectedTypeIdRef.current =
      selectedTypeId || state.values?.tripRequestTypeId || "";
  });

  const selectedType = requestTypes.find(
    (type) => String(type.tripRequestTypeId) === selectedTypeId,
  );
  const submittedType = requestTypes.find(
    (type) =>
      String(type.tripRequestTypeId) ===
      (state.values?.tripRequestTypeId || selectedTypeId),
  );
  const shareOrigin = sharesOrigin(selectedType?.typeCode);
  const shareDestination = sharesDestination(selectedType?.typeCode);
  const errorFocus = wizardErrorNavigation(
    state.error,
    state.field,
    state.values,
    submittedType?.typeCode ?? selectedType?.typeCode,
    catalogLocations,
  );
  const value = (name: string) =>
    isLocationField(name)
      ? preservedLocationValue(keptLocations, state.values, name)
      : (state.values?.[name] ?? "");
  const fieldInvalid = (name: string) =>
    state.error
      ? errorFocus.fields.includes(name)
      : state.field === name;
  const fieldErrorId = (name: string) =>
    fieldInvalid(name) ? `${prefix}-${name}-error` : undefined;

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    function handleReset() {
      const next = selectedTypeIdRef.current;
      if (!next) return;
      setSelectedTypeId(next);
      setTypeRestoreNonce((nonce) => nonce + 1);
    }
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    function addLocation(event: Event) {
      const location = (
        event as CustomEvent<{ location: TripLocationReference }>
      ).detail.location;
      setCatalogLocations((current) =>
        current.some(
          (item) => item.locationId === location.locationId,
        )
          ? current
          : [...current, location],
      );
    }
    window.addEventListener(LOCATION_CREATED_EVENT, addLocation);
    return () =>
      window.removeEventListener(LOCATION_CREATED_EVENT, addLocation);
  }, []);

  const [seenActionState, setSeenActionState] = useState(state);
  if (state !== seenActionState) {
    setSeenActionState(state);
    if (state.values) {
      setKeptLocations((current) =>
        mergePreservedLocationValues(current, state.values ?? {}),
      );
    }
    if (state.error) {
      setReviewOpen(false);
      setStep(errorFocus.step);
      setStepNotice(null);
    }
  }

  const focusFieldsKey = errorFocus.fields.join("|");
  useEffect(() => {
    if (!state.error || !focusFieldsKey || !formRef.current) {
      return;
    }
    for (const field of focusFieldsKey.split("|")) {
      const invalid = formRef.current.querySelector<HTMLElement>(
        `[name="${field}"], #${prefix}-${field}`,
      );
      if (invalid) {
        invalid.focus();
        return;
      }
    }
  }, [focusFieldsKey, prefix, state.error, step]);

  function readValues() {
    const form = formRef.current;
    if (!form) return null;
    return tripFormValues(new FormData(form));
  }

  function goToPassengers() {
    const values = readValues();
    if (!values) return;
    const gaps = requestStepGaps(values, selectedType?.typeCode);
    if (gaps.length > 0) {
      setStepNotice(gapNotice(gaps));
      return;
    }
    setStepNotice(null);
    setStep(2);
  }

  function openReview() {
    const values = readValues();
    if (!values) return;
    const gaps = passengerStepGaps(values, selectedType?.typeCode);
    if (gaps.length > 0) {
      setStepNotice(gapNotice(gaps));
      return;
    }
    setStepNotice(null);
    setReview(
      createRequestReview(values, {
        requestTypes,
        people,
        locations: catalogLocations,
      }),
    );
    setReviewOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!shouldSubmitCreateForm(reviewOpen)) {
      event.preventDefault();
    }
  }

  return (
    <form
      id={formId}
      ref={formRef}
      action={formAction}
      noValidate
      aria-busy={pending}
      aria-label="ثبت درخواست سفر"
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <TripCreateProgress currentIndex={reviewOpen ? 2 : step - 1} />

      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      {stepNotice && (
        <InlineNotice tone="danger" role="alert">
          {stepNotice}
        </InlineNotice>
      )}

      <div className={styles.wizardPanes}>
        <RequestStep
          hidden={step !== 1}
          prefix={prefix}
          pending={pending}
          requestTypes={requestTypes}
          locations={catalogLocations}
          selectedTypeId={selectedTypeId}
          typeRestoreNonce={typeRestoreNonce}
          selectedType={selectedType}
          shareOrigin={shareOrigin}
          shareDestination={shareDestination}
          state={state}
          value={value}
          fieldInvalid={fieldInvalid}
          fieldErrorId={fieldErrorId}
          onTypeChange={(typeId) => {
            const values = readValues();
            if (values) {
              setKeptLocations((current) =>
                mergePreservedLocationValues(current, values),
              );
            }
            setSelectedTypeId(typeId);
          }}
          onNext={goToPassengers}
        />
        <PassengersStep
          hidden={step !== 2}
          prefix={prefix}
          pending={pending}
          people={people}
          locations={catalogLocations}
          passengerCount={passengerCount}
          shareOrigin={shareOrigin}
          shareDestination={shareDestination}
          value={value}
          fieldInvalid={fieldInvalid}
          onAddPassenger={() => setPassengerCount((count) => count + 1)}
          onRemoveLastPassenger={() =>
            setPassengerCount((count) => Math.max(1, count - 1))
          }
          onBack={() => {
            setStepNotice(null);
            setStep(1);
          }}
          onReview={openReview}
        />
      </div>

      <TripRequestReviewDialog
        open={reviewOpen}
        titleId={reviewTitleId}
        formId={formId}
        pending={pending}
        review={review}
        onClose={() => setReviewOpen(false)}
      />
    </form>
  );
}
