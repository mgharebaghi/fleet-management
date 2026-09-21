"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import {
  FieldLabel,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type {
  TripLocationReference,
  TripPassengerRecord,
  TripRoute,
} from "../../application/trip-records";
import { addTripRouteAction } from "../trip.actions";
import { tripMessages, type TripActionState } from "../trip-form-data";
import { LocationPicker, LOCATION_CREATED_EVENT } from "../location/location-picker";
import styles from "../trip-forms.module.css";

export type RouteActionState = TripActionState & { success?: boolean };

export type RouteModalStep = 1 | 2 | 3;

export const WIZARD_STEPS: { step: RouteModalStep; label: string }[] = [
  { step: 1, label: "مشخصات مسیر" },
  { step: 2, label: "نقاط مسیر" },
  { step: 3, label: "مرور و ذخیره" },
];

function formatPointMeta(dist?: string, zone?: string, desc?: string): string {
  const parts: string[] = [];
  if (dist && dist.trim()) parts.push(`${dist.trim()} کیلومتر از شروع`);
  if (zone && zone.trim()) parts.push(`محدوده ${zone.trim()}`);
  if (desc && desc.trim()) parts.push(desc.trim());
  return parts.join(" · ");
}

export function hydrateRouteFormValues(
  route: TripRoute,
  fallbackTripId?: number,
): Record<string, string> {
  const tripId = route.tripId ?? fallbackTripId;
  const values: Record<string, string> = {
    routeId: String(route.routeId),
    tripId: tripId ? String(tripId) : "",
    routeName: route.routeName || "",
    isSelected: route.isSelected ? "true" : "false",
    distanceKm: route.distanceKm ?? "",
    estimatedDurationMinute:
      route.estimatedDurationMinute !== null &&
      route.estimatedDurationMinute !== undefined
        ? String(route.estimatedDurationMinute)
        : "",
    alternativeNo:
      route.alternativeNo !== null && route.alternativeNo !== undefined
        ? String(route.alternativeNo)
        : "",
    routeDescription: route.description ?? "",
    pointCount: String(Math.max(1, route.points?.length ?? 1)),
  };

  if (route.points && route.points.length > 0) {
    route.points.forEach((point, idx) => {
      values[`point.${idx}.locationId`] = String(point.location.locationId);
      values[`point.${idx}.sequenceNo`] = String(point.sequenceNo ?? idx + 1);
      values[`point.${idx}.distanceFromStartKm`] =
        point.distanceFromStartKm ?? "";
      values[`point.${idx}.trafficZone`] = point.trafficZone ?? "";
      values[`point.${idx}.description`] = point.description ?? "";
    });
  }

  return values;
}

export function validateRouteStep1(values: {
  tripId?: string;
  routeName?: string;
}): string | null {
  if (!values.tripId || !values.tripId.trim()) {
    return "سفر مسافر را انتخاب کنید.";
  }
  if (!values.routeName || !values.routeName.trim()) {
    return "نام مسیر را وارد کنید.";
  }
  return null;
}

export function resolveTargetRoute({
  initialRoute,
  targetTripId,
  passengers,
}: {
  initialRoute?: TripRoute | null;
  targetTripId?: number | null;
  passengers: TripPassengerRecord[];
}): TripRoute | null {
  if (initialRoute !== undefined) {
    return initialRoute;
  }
  // Only resolve for the targeted trip, never across other passengers!
  const effectiveTripId =
    targetTripId ?? (passengers.length === 1 ? passengers[0].tripId : null);
  if (!effectiveTripId) {
    return null;
  }
  const targetPassenger = passengers.find((p) => p.tripId === effectiveTripId);
  if (
    !targetPassenger ||
    !targetPassenger.routes ||
    targetPassenger.routes.length === 0
  ) {
    return null;
  }
  return (
    targetPassenger.routes.find((r) => r.isSelected) ??
    targetPassenger.routes[0] ??
    null
  );
}

export type TripRouteFormProps = {
  tripRequestId: number;
  passengers: TripPassengerRecord[];
  locations: TripLocationReference[];
  initialRoute?: TripRoute | null;
  targetTripId?: number | null;
  onCancel?: () => void;
  onSuccess?: () => void;
  action?: (state: RouteActionState, data: FormData) => Promise<RouteActionState>;
  initialState?: RouteActionState;
};

export function TripRouteForm({
  tripRequestId,
  passengers,
  locations,
  initialRoute,
  targetTripId,
  onCancel,
  onSuccess,
  action,
  initialState,
}: TripRouteFormProps) {
  const defaultAction = addTripRouteAction.bind(null, tripRequestId);
  const [state, formAction, pending] = useActionState<RouteActionState, FormData>(
    action ?? defaultAction,
    initialState ?? {},
  );
  const prefix = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const resolvedRoute = resolveTargetRoute({
    initialRoute,
    targetTripId,
    passengers,
  });

  const effectiveDefaultTripId =
    targetTripId ??
    resolvedRoute?.tripId ??
    (passengers.length === 1 ? passengers[0].tripId : undefined);

  const initialValues = (() => {
    if (state.values && Object.keys(state.values).length > 0) {
      return state.values;
    }
    if (resolvedRoute) {
      return hydrateRouteFormValues(resolvedRoute, effectiveDefaultTripId);
    }
    if (effectiveDefaultTripId) {
      return { tripId: String(effectiveDefaultTripId) };
    }
    return {};
  })();

  const [step, setStep] = useState<RouteModalStep>(1);
  const [clientError, setClientError] = useState<string | null>(null);

  const [pointIds, setPointIds] = useState<number[]>(() => {
    if (resolvedRoute?.points && resolvedRoute.points.length > 0) {
      return resolvedRoute.points.map((_, i) => i);
    }
    const count = Math.max(0, Number(state.values?.pointCount ?? 0) || 0);
    return Array.from({ length: count }, (_, i) => i);
  });

  const [expandedPointIndex, setExpandedPointIndex] = useState<number | null>(() => {
    if (resolvedRoute?.points && resolvedRoute.points.length > 0) {
      return null;
    }
    return null;
  });

  const [snapshotValues, setSnapshotValues] = useState<Record<string, string>>(initialValues);
  const [allLocations, setAllLocations] = useState<TripLocationReference[]>(locations);

  useEffect(() => {
    function handleLocationCreated(event: Event) {
      const detail = (
        event as CustomEvent<{
          location: TripLocationReference;
          sourcePickerId: string;
        }>
      ).detail;
      if (!detail?.location) return;
      setAllLocations((current) =>
        current.some((loc) => loc.locationId === detail.location.locationId)
          ? current
          : [...current, detail.location].sort((a, b) =>
              a.locationName.localeCompare(b.locationName, "fa"),
            ),
      );
      if (expandedPointIndex !== null) {
        setSnapshotValues((prev) => ({
          ...prev,
          [`point.${expandedPointIndex}.locationId`]: String(
            detail.location.locationId,
          ),
        }));
      }
    }
    window.addEventListener(LOCATION_CREATED_EVENT, handleLocationCreated);
    return () =>
      window.removeEventListener(LOCATION_CREATED_EVENT, handleLocationCreated);
  }, [expandedPointIndex]);

  useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess();
    }
  }, [state, onSuccess]);

  function readFormValues(): Record<string, string> {
    const form = formRef.current;
    if (!form) return snapshotValues;
    const data = new FormData(form);
    const res: Record<string, string> = {};
    data.forEach((val, key) => {
      if (typeof val === "string") {
        res[key] = val;
      }
    });
    setSnapshotValues(res);
    return res;
  }

  const value = (name: string) => snapshotValues[name] ?? state.values?.[name] ?? "";

  function handleNextStep1() {
    const current = readFormValues();
    const tripId = current.tripId || value("tripId");
    const routeName = current.routeName || value("routeName");

    const err = validateRouteStep1({ tripId, routeName });
    if (err) {
      setClientError(err);
      return;
    }

    setClientError(null);
    setStep(2);
  }

  function handleAddPoint() {
    readFormValues();
    const nextId = pointIds.length > 0 ? Math.max(...pointIds) + 1 : 0;
    setPointIds((ids) => [...ids, nextId]);
    setExpandedPointIndex(pointIds.length);
  }

  function handleRemovePoint(indexToRemove: number) {
    const current = readFormValues();
    const nextValues = { ...current };
    for (let index = indexToRemove; index < pointIds.length; index += 1) {
      for (const suffix of ["locationId", "sequenceNo", "distanceFromStartKm", "trafficZone", "description"]) {
        const target = `point.${index}.${suffix}`;
        const source = `point.${index + 1}.${suffix}`;
        if (index + 1 < pointIds.length) nextValues[target] = current[source] ?? "";
        else delete nextValues[target];
      }
    }
    setSnapshotValues(nextValues);
    setPointIds((ids) => ids.filter((_, idx) => idx !== indexToRemove));
    if (expandedPointIndex === indexToRemove) {
      setExpandedPointIndex(null);
    } else if (expandedPointIndex !== null && expandedPointIndex > indexToRemove) {
      setExpandedPointIndex(expandedPointIndex - 1);
    }
  }

  function handleTogglePoint(index: number) {
    readFormValues();
    setExpandedPointIndex((curr) => (curr === index ? null : index));
  }

  function handleNextStep2() {
    const current = readFormValues();
    for (let i = 0; i < pointIds.length; i++) {
      const locId = current[`point.${i}.locationId`] || value(`point.${i}.locationId`);
      if (!locId || !locId.trim()) {
        setClientError(`لطفاً مکان را برای نقطه ${i + 1} انتخاب کنید.`);
        setExpandedPointIndex(i);
        return;
      }
    }
    setClientError(null);
    setStep(3);
  }

  function handlePrev() {
    readFormValues();
    setClientError(null);
    setStep((curr) => (curr > 1 ? ((curr - 1) as RouteModalStep) : curr));
  }

  function lookupLocationName(locId?: string): string {
    if (!locId) return "مکان انتخاب‌نشده";
    const found = allLocations.find((l) => String(l.locationId) === locId);
    return found ? found.locationName : "مکان انتخاب‌نشده";
  }

  const tripOptions = passengers.map((trip) => ({
    value: String(trip.tripId),
    label: `${trip.passenger.firstName} ${trip.passenger.lastName} ${trip.origin.locationName} ${trip.destination.locationName}`,
    searchText: `${trip.passenger.firstName} ${trip.passenger.lastName} ${trip.origin.locationName} ${trip.destination.locationName}`,
    content: (
      <span>
        {trip.passenger.firstName} {trip.passenger.lastName} —{" "}
        {trip.origin.locationName} ← {trip.destination.locationName}
      </span>
    ),
  }));

  const selectedTripId = snapshotValues.tripId || value("tripId");
  const selectedPassenger = passengers.find(
    (trip) => String(trip.tripId) === selectedTripId,
  );
  const selectedPassengerLabel = selectedPassenger
    ? `${selectedPassenger.passenger.firstName} ${selectedPassenger.passenger.lastName} (${selectedPassenger.origin.locationName} ← ${selectedPassenger.destination.locationName})`
    : "—";

  const errorNotice =
    clientError ||
    (state.error
      ? tripMessages[state.error as keyof typeof tripMessages] ?? "خطا در ثبت مسیر"
      : null);

  return (
    <form
      ref={formRef}
      action={formAction}
      aria-label={
        value("routeId") ? "ویرایش مسیر برنامه‌ریزی‌شده" : "ثبت مسیر برنامه‌ریزی‌شده"
      }
      aria-busy={pending}
      className={styles.routeWizardForm}
    >
      {value("routeId") && (
        <input type="hidden" name="routeId" value={value("routeId")} />
      )}

      <nav aria-label="مراحل ثبت مسیر" className={styles.routeWizardNav}>
        <ol className={styles.routeWizardStepList}>
          {WIZARD_STEPS.map((item, idx) => {
            const isActive = step === item.step;
            const isCompleted = step > item.step;
            return (
              <li
                key={item.step}
                className={styles.routeWizardStepItem}
                data-status={isActive ? "active" : isCompleted ? "complete" : "upcoming"}
                aria-current={isActive ? "step" : undefined}
              >
                <div className={styles.routeWizardStepContent}>
                  <span className={styles.routeWizardStepNumber}>
                    {isCompleted ? "✓" : item.step}
                  </span>
                  <span className={styles.routeWizardStepLabel}>
                    {item.label}
                  </span>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <span
                    className={styles.routeWizardStepDivider}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {errorNotice && (
        <InlineNotice tone="danger" role="alert">
          {errorNotice}
        </InlineNotice>
      )}

      {/* STEP 1: مشخصات مسیر */}
      <div hidden={step !== 1} className={styles.routeWizardStepPane}>
        {/* بخش اول: اطلاعات مسیر */}
        <section className={styles.routeFormGroup}>
          <div className={styles.routeGroupHeader}>
            <h4 className={styles.routeGroupTitle}>اطلاعات مسیر</h4>
          </div>
          <FormField className={styles.fullSpan}>
            <SearchableSelect
              name="tripId"
              label="سفر مسافر"
              options={tripOptions}
              defaultValue={value("tripId")}
              placeholder="انتخاب سفر مسافر"
              searchPlaceholder="جستجوی مسافر، مبدأ یا مقصد…"
              required
              disabled={pending}
            />
          </FormField>
          <div className={styles.routeGrid2Col}>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-route-name`} required>
                نام مسیر
              </FieldLabel>
              <input
                id={`${prefix}-route-name`}
                name="routeName"
                className={formControlClassName}
                defaultValue={value("routeName")}
                disabled={pending}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-selected`}>
                وضعیت انتخاب
              </FieldLabel>
              <select
                id={`${prefix}-selected`}
                name="isSelected"
                className={formControlClassName}
                defaultValue={value("isSelected") || "false"}
                disabled={pending}
              >
                <option value="false">مسیر جایگزین</option>
                <option value="true">مسیر انتخاب‌شده</option>
              </select>
            </FormField>
          </div>
        </section>

        {/* بخش دوم: برآورد مسیر */}
        <section className={styles.routeFormGroup}>
          <div className={styles.routeGroupHeader}>
            <h4 className={styles.routeGroupTitle}>برآورد مسیر</h4>
          </div>
          <div className={styles.routeGrid3Col}>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-distance`}>
                مسافت (کیلومتر)
              </FieldLabel>
              <input
                id={`${prefix}-distance`}
                name="distanceKm"
                className={formControlClassName}
                inputMode="decimal"
                dir="ltr"
                defaultValue={value("distanceKm")}
                disabled={pending}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-duration`}>
                مدت تخمینی (دقیقه)
              </FieldLabel>
              <input
                id={`${prefix}-duration`}
                name="estimatedDurationMinute"
                className={formControlClassName}
                inputMode="numeric"
                dir="ltr"
                defaultValue={value("estimatedDurationMinute")}
                disabled={pending}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-alternative`}>
                شمارهٔ مسیر جایگزین
              </FieldLabel>
              <input
                id={`${prefix}-alternative`}
                name="alternativeNo"
                className={formControlClassName}
                inputMode="numeric"
                dir="ltr"
                defaultValue={value("alternativeNo")}
                disabled={pending}
              />
            </FormField>
          </div>
        </section>

        {/* بخش سوم: توضیحات */}
        <section className={styles.routeFormGroup}>
          <div className={styles.routeGroupHeader}>
            <h4 className={styles.routeGroupTitle}>توضیحات تکمیلی</h4>
          </div>
          <FormField className={styles.fullSpan}>
            <FieldLabel htmlFor={`${prefix}-route-description`}>
              توضیحات مسیر
            </FieldLabel>
            <textarea
              id={`${prefix}-route-description`}
              name="routeDescription"
              className={formControlClassName}
              rows={2}
              defaultValue={value("routeDescription")}
              disabled={pending}
            />
          </FormField>
        </section>
      </div>

      {/* STEP 2: نقاط مسیر */}
      <div hidden={step !== 2} className={styles.routeWizardStepPane}>
        <div className={styles.routePointsHeader}>
          <p className={styles.routeStepHelp}>
            نقاط مسیر را به‌ترتیب سفر ثبت کنید.
          </p>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={handleAddPoint}
          >
            + افزودن نقطه
          </ActionButton>
        </div>

        <input type="hidden" name="pointCount" value={pointIds.length} readOnly />

        <div className={styles.pointListContainer}>
          {pointIds.length === 0 && (
            <p className={styles.routeStepHelp}>
              هنوز نقطه‌ای به مسیر اضافه نشده است.
            </p>
          )}
          {pointIds.map((id, index) => {
            const locId =
              snapshotValues[`point.${index}.locationId`] ||
              value(`point.${index}.locationId`);
            const seqNo =
              snapshotValues[`point.${index}.sequenceNo`] ||
              value(`point.${index}.sequenceNo`) ||
              String(index + 1);
            const dist =
              snapshotValues[`point.${index}.distanceFromStartKm`] ||
              value(`point.${index}.distanceFromStartKm`);
            const zone =
              snapshotValues[`point.${index}.trafficZone`] ||
              value(`point.${index}.trafficZone`);
            const desc =
              snapshotValues[`point.${index}.description`] ||
              value(`point.${index}.description`);
            const locName = lookupLocationName(locId);
            const meta = formatPointMeta(dist, zone, desc);
            const isExpanded = expandedPointIndex === index;

            return (
              <div key={id} className={styles.pointItem}>
                {!isExpanded ? (
                  <div className={styles.pointCompactRow}>
                    <div className={styles.pointCompactInfo}>
                      <span className={styles.pointOrderBadge}>{seqNo}</span>
                      <div className={styles.pointCompactText}>
                        <strong>{locName}</strong>
                        {meta && (
                          <span className={styles.pointCompactMeta}>{meta}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.pointCompactActions}>
                      <button
                        type="button"
                        className={styles.pointMiniButton}
                        onClick={() => handleTogglePoint(index)}
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className={styles.pointMiniRemoveButton}
                        onClick={() => handleRemovePoint(index)}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.pointEditorCard}>
                    <div className={styles.pointEditorHeader}>
                      <div className={styles.pointEditorTitle}>
                        <span className={styles.pointOrderBadge}>{seqNo}</span>
                        <span>ویرایش نقطه {index + 1}</span>
                      </div>
                      <div className={styles.pointEditorActions}>
                        <button
                          type="button"
                          className={styles.pointMiniButton}
                          onClick={() => handleTogglePoint(index)}
                        >
                          بستن
                        </button>
                        <button
                          type="button"
                          className={styles.pointMiniRemoveButton}
                          onClick={() => handleRemovePoint(index)}
                        >
                          حذف نقطه
                        </button>
                      </div>
                    </div>
                    <FormGrid>
                      <FormField className={styles.fullSpan}>
                        <LocationPicker
                          name={`point.${index}.locationId`}
                          label="مکان"
                          locations={allLocations}
                          defaultValue={locId}
                          required
                          disabled={pending}
                        />
                      </FormField>
                      <FormField>
                        <FieldLabel htmlFor={`${prefix}-sequence-${id}`}>
                          ترتیب
                        </FieldLabel>
                        <input
                          id={`${prefix}-sequence-${id}`}
                          name={`point.${index}.sequenceNo`}
                          className={formControlClassName}
                          inputMode="numeric"
                          dir="ltr"
                          defaultValue={seqNo}
                          disabled={pending}
                        />
                      </FormField>
                      <FormField>
                        <FieldLabel htmlFor={`${prefix}-point-distance-${id}`}>
                          فاصله از شروع (کیلومتر)
                        </FieldLabel>
                        <input
                          id={`${prefix}-point-distance-${id}`}
                          name={`point.${index}.distanceFromStartKm`}
                          className={formControlClassName}
                          inputMode="decimal"
                          dir="ltr"
                          defaultValue={dist}
                          disabled={pending}
                        />
                      </FormField>
                      <FormField>
                        <FieldLabel htmlFor={`${prefix}-traffic-${id}`}>
                          محدودهٔ ترافیکی
                        </FieldLabel>
                        <input
                          id={`${prefix}-traffic-${id}`}
                          name={`point.${index}.trafficZone`}
                          className={formControlClassName}
                          defaultValue={zone}
                          disabled={pending}
                        />
                      </FormField>
                      <FormField className={styles.fullSpan}>
                        <FieldLabel htmlFor={`${prefix}-point-description-${id}`}>
                          توضیحات نقطه
                        </FieldLabel>
                        <input
                          id={`${prefix}-point-description-${id}`}
                          name={`point.${index}.description`}
                          className={formControlClassName}
                          defaultValue={desc}
                          disabled={pending}
                        />
                      </FormField>
                    </FormGrid>
                    <div className={styles.pointEditorDoneRow}>
                      <ActionButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTogglePoint(index)}
                      >
                        تأیید نقطه
                      </ActionButton>
                    </div>
                  </div>
                )}

                {/* Hidden inputs keep values mounted when collapsed */}
                {!isExpanded && (
                  <div hidden className={styles.pointEditorFields}>
                    <input
                      type="hidden"
                      name={`point.${index}.locationId`}
                      value={locId}
                    />
                    <input
                      type="hidden"
                      name={`point.${index}.sequenceNo`}
                      value={seqNo}
                    />
                    <input
                      type="hidden"
                      name={`point.${index}.distanceFromStartKm`}
                      value={dist}
                    />
                    <input
                      type="hidden"
                      name={`point.${index}.trafficZone`}
                      value={zone}
                    />
                    <input
                      type="hidden"
                      name={`point.${index}.description`}
                      value={desc}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: مرور و ذخیره */}
      <div hidden={step !== 3} className={styles.routeWizardStepPane}>
        <p className={styles.routeStepHelp}>
          اطلاعات واردشده را بررسی کرده و در صورت تأیید، مسیر را ذخیره کنید.
        </p>

        <div className={styles.reviewSection}>
          <h4 className={styles.reviewSectionTitle}>مشخصات کلی مسیر</h4>
          <dl className={styles.reviewFacts}>
            <div>
              <dt>سفر مسافر</dt>
              <dd>{selectedPassengerLabel}</dd>
            </div>
            <div>
              <dt>نام مسیر</dt>
              <dd>{snapshotValues.routeName || value("routeName") || "—"}</dd>
            </div>
            <div>
              <dt>وضعیت انتخاب</dt>
              <dd>
                <StatusBadge
                  label={
                    (snapshotValues.isSelected || value("isSelected")) === "true"
                      ? "مسیر انتخاب‌شده"
                      : "مسیر جایگزین"
                  }
                  tone={
                    (snapshotValues.isSelected || value("isSelected")) === "true"
                      ? "positive"
                      : "info"
                  }
                />
              </dd>
            </div>
            <div>
              <dt>مسافت</dt>
              <dd>
                {snapshotValues.distanceKm || value("distanceKm")
                  ? `${snapshotValues.distanceKm || value("distanceKm")} کیلومتر`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>مدت تخمینی</dt>
              <dd>
                {snapshotValues.estimatedDurationMinute ||
                value("estimatedDurationMinute")
                  ? `${snapshotValues.estimatedDurationMinute || value("estimatedDurationMinute")} دقیقه`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>شماره مسیر جایگزین</dt>
              <dd>
                {snapshotValues.alternativeNo || value("alternativeNo") || "—"}
              </dd>
            </div>
            {(snapshotValues.routeDescription || value("routeDescription")) && (
              <div className={styles.fullSpan}>
                <dt>توضیحات مسیر</dt>
                <dd>
                  {snapshotValues.routeDescription || value("routeDescription")}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className={styles.reviewSection}>
          <h4 className={styles.reviewSectionTitle}>
            نقاط مسیر ({pointIds.length} نقطه)
          </h4>
          <div className={styles.reviewPointsList}>
            {pointIds.map((_, idx) => {
              const locId =
                snapshotValues[`point.${idx}.locationId`] ||
                value(`point.${idx}.locationId`);
              const seq =
                snapshotValues[`point.${idx}.sequenceNo`] ||
                value(`point.${idx}.sequenceNo`) ||
                idx + 1;
              const dist =
                snapshotValues[`point.${idx}.distanceFromStartKm`] ||
                value(`point.${idx}.distanceFromStartKm`);
              const zone =
                snapshotValues[`point.${idx}.trafficZone`] ||
                value(`point.${idx}.trafficZone`);
              const desc =
                snapshotValues[`point.${idx}.description`] ||
                value(`point.${idx}.description`);
              const locName = lookupLocationName(locId);

              return (
                <div key={idx} className={styles.reviewPointCard}>
                  <div className={styles.reviewPointOrder}>
                    <span className={styles.pointOrderBadge}>{seq}</span>
                  </div>
                  <div className={styles.reviewPointDetails}>
                    <strong>{locName}</strong>
                    {(dist || zone) && (
                      <span className={styles.reviewPointMeta}>
                        {dist && `${dist} کیلومتر از شروع`}
                        {dist && zone && " · "}
                        {zone && `محدوده ${zone}`}
                      </span>
                    )}
                    {desc && <p className={styles.reviewPointDesc}>{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STABLE FOOTER */}
      <div className={styles.routeWizardFooter}>
        <div className={styles.routeWizardFooterPrimary}>
          {step === 1 && (
            <ActionButton type="button" onClick={handleNextStep1}>
              بعدی
            </ActionButton>
          )}
          {step === 2 && (
            <ActionButton type="button" onClick={handleNextStep2}>
              بعدی
            </ActionButton>
          )}
          {step === 3 && (
            <ActionButton type="submit" disabled={pending} pending={pending}>
              {pending
                ? "در حال ثبت…"
                : value("routeId")
                  ? "ذخیره تغییرات مسیر"
                  : "ذخیره مسیر"}
            </ActionButton>
          )}
        </div>
        <div className={styles.routeWizardFooterSecondary}>
          {step > 1 && (
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={handlePrev}
            >
              قبلی
            </ActionButton>
          )}
          {onCancel && (
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onCancel}
            >
              انصراف
            </ActionButton>
          )}
        </div>
      </div>
    </form>
  );
}
