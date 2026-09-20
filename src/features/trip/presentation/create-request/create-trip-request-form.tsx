"use client";

import { useEffect, useId, useInsertionEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type {
  TripLocationReference,
  TripPersonReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { loadCreateTripAssignmentsAction } from "../trip.actions";
import { consecutiveFormIndexes, tripFormValues, type TripActionState } from "../trip-form-data";
import { LOCATION_CREATED_EVENT } from "../location/location-picker";
import { AssignmentStep } from "./assignment-step";
import { CreateRequestSummary } from "./create-request-summary";
import {
  createRequestReview,
  createRequestSummaryPreview,
  dropPassengerSnapshot,
  gapNotice,
  isLocationField,
  mergePassengerSnapshots,
  mergePreservedLocationValues,
  passengerIndexFromField,
  passengerStepGaps,
  preservedLocationValue,
  requestStepGaps,
  sharesDestination,
  sharesOrigin,
  wizardErrorNavigation,
  type CreateWizardAssignments,
  type CreateWizardPassenger,
  type CreateWizardRoute,
  type CreateWizardStep,
  type TripRequestReview,
  type TripRequestSummaryPreview,
} from "./create-wizard";
import { PassengersStep } from "./passengers-step";
import { PlanningStep } from "./planning-step";
import { RequestStep } from "./request-step";
import { ReviewStep } from "./review-step";
import { RouteStep } from "./route-step";
import { TripCreateProgress } from "./trip-create-progress";
import styles from "./create-trip.module.css";

type CreateTripRequestFormProps = {
  requestTypes: TripRequestTypeReference[];
  people: TripPersonReference[];
  locations: TripLocationReference[];
};

function tehranIso(day: string | undefined, time: string | undefined) {
  if (!day || !time) return "";
  const value = new Date(`${day}T${time}:00+03:30`);
  return Number.isFinite(value.getTime()) ? value.toISOString() : "";
}

export function CreateTripRequestForm({ requestTypes, people, locations }: CreateTripRequestFormProps) {
  const router = useRouter();
  const prefix = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<CreateWizardStep>(1);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [catalogLocations, setCatalogLocations] = useState(locations);
  const [passengerCount, setPassengerCount] = useState(1);
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [formValuesState, setFormValuesState] = useState<Record<string, string>>({});
  const [passengerSnapshots, setPassengerSnapshots] = useState<Record<number, Record<string, string>>>({});
  const [summaryPreview, setSummaryPreview] = useState<TripRequestSummaryPreview | null>(null);
  const [review, setReview] = useState<TripRequestReview | null>(null);
  const [pendingPassengers, setPendingPassengers] = useState<CreateWizardPassenger[]>([]);
  const [assignmentsByPassenger, setAssignmentsByPassenger] = useState<CreateWizardAssignments>({});
  const [selectedAssignments, setSelectedAssignments] = useState<Record<number, number>>({});
  const [routes, setRoutes] = useState<CreateWizardRoute[]>([]);
  const [isLoadingAssignments, startLoadingAssignments] = useTransition();
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [keptLocations, setKeptLocations] = useState<Record<string, string>>({});
  const [typeRestoreNonce, setTypeRestoreNonce] = useState(0);
  const selectedTypeIdRef = useRef(selectedTypeId);
  const [formErrorState] = useState<TripActionState>({});

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

  function readValues() {
    const form = formRef.current;
    if (!form) return formValuesState;
    return { ...formValuesState, ...(tripFormValues(new FormData(form)) ?? {}) };
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

  function navigateStep(nextStep: CreateWizardStep) {
    setStepNotice(null);
    setStep(nextStep);
  }

  function goToPassengers() {
    const values = readValues();
    const gaps = requestStepGaps(values, selectedType?.typeCode);
    if (gaps.length) {
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
    snapshotActivePassenger();
    const removedIndex = passengerCount - 1;
    setPassengerCount((count) => Math.max(1, count - 1));
    setPassengerSnapshots((current) => dropPassengerSnapshot(current, removedIndex));
    setSelectedAssignments((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== removedIndex)));
    setRoutes((current) => current.filter((route) => route.passengerKey !== removedIndex));
    setActivePassengerIndex((index) => Math.min(index, Math.max(0, passengerCount - 2)));
  }

  function buildPendingPassengers(values: Record<string, string>, nextReview: TripRequestReview): CreateWizardPassenger[] {
    const indexes = consecutiveFormIndexes(values, (index) => `passenger.${index}.personId`);
    const travelAt = tehranIso(values.requestedTravelDay, values.requestedTravelTime);
    return indexes.map((index) => {
      const person = people.find((item) => item.personId === Number(values[`passenger.${index}.personId`]));
      const reviewed = nextReview.passengers[index];
      const hasOverride = values[`passenger.${index}.pickupOverride`] === "true";
      return {
        key: index,
        personId: person?.personId ?? Number.NaN,
        personName: reviewed?.personName ?? "",
        personnelNo: person?.personnelNo ?? null,
        originName: reviewed?.originName ?? "",
        destinationName: reviewed?.destinationName ?? "",
        requestedPickupAt: hasOverride ? tehranIso(values[`passenger.${index}.pickupDay`], values[`passenger.${index}.pickupTime`]) : travelAt,
        requestedPickupLabel: reviewed?.pickup ?? nextReview.travelAt,
      };
    });
  }

  function goToAssignments() {
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
    setPendingPassengers(buildPendingPassengers(values, nextReview));
    setFormValuesState(values);
    setStepNotice(null);
    startLoadingAssignments(async () => {
      try {
        const available = await loadCreateTripAssignmentsAction(values);
        setAssignmentsByPassenger(available);
        setSelectedAssignments((current) => Object.fromEntries(Object.entries(current).filter(([key, id]) => (available[Number(key)] ?? []).some((item) => item.assignmentId === id))));
        navigateStep(3);
      } catch {
        setStepNotice("دریافت فهرست تخصیص‌های واجد شرایط انجام نشد.");
      }
    });
  }

  const completeReview = review ?? createRequestReview(formValuesState, { requestTypes, people, locations: catalogLocations });
  const payload = { values: formValuesState, assignments: selectedAssignments, routes };

  return (
    <div className={styles.createShell}>
      <TripCreateProgress currentIndex={step - 1} />
      <form
        ref={formRef}
        noValidate
        hidden={step > 2}
        aria-busy={isLoadingAssignments}
        aria-label="ثبت درخواست سفر"
        className={styles.createSurface}
        onSubmit={(event) => event.preventDefault()}
      >
        <CreateRequestSummary preview={summaryPreview} passengerCount={passengerCount} />
        {stepNotice && <InlineNotice tone="danger" role="alert">{stepNotice}</InlineNotice>}
        <RequestStep
          hidden={step !== 1}
          prefix={prefix}
          pending={isLoadingAssignments}
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
          onCancel={() => router.push("/trips/requests")}
        />
        <PassengersStep
          hidden={step !== 2}
          prefix={prefix}
          pending={isLoadingAssignments}
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
          onReview={goToAssignments}
        />
      </form>

      <AssignmentStep
        hidden={step !== 3}
        passengers={pendingPassengers}
        assignmentsByPassenger={assignmentsByPassenger}
        selectedAssignments={selectedAssignments}
        onSelectionChange={(key, assignmentId) => setSelectedAssignments((current) => ({ ...current, [key]: assignmentId }))}
        onBack={() => navigateStep(2)}
        onNext={() => navigateStep(4)}
      />
      <RouteStep hidden={step !== 4} passengers={pendingPassengers} locations={catalogLocations} routes={routes} onRoutesChange={setRoutes} onBack={() => navigateStep(3)} onNext={() => navigateStep(5)} />
      <PlanningStep hidden={step !== 5} passengers={pendingPassengers} assignmentsByPassenger={assignmentsByPassenger} selectedAssignments={selectedAssignments} routes={routes} onBack={() => navigateStep(4)} onNext={() => navigateStep(6)} />
      <ReviewStep hidden={step !== 6} review={completeReview} passengers={pendingPassengers} assignmentsByPassenger={assignmentsByPassenger} payload={payload} onBack={() => navigateStep(5)} />
    </div>
  );
}
