"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { IconActionButton, IconActionGroup } from "@/components/ui/icon-action-button/icon-action-button";
import { DeleteIcon, MoveDownIcon, MoveUpIcon } from "@/components/ui/icon/icons";
import {
  FieldLabel,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import type {
  TripLocationReference,
  TripPassengerRecord,
  TripRoute,
} from "../../application/trip-records";
import type { MapRoute } from "../../../../maps/map-route";
import { addTripRouteAction } from "../trip.actions";
import { tripMessages, type TripActionState } from "../trip-form-data";
import { LocationPicker, LOCATION_CREATED_EVENT } from "../location/location-picker";
import {
  acceptAssistedSuggestion,
  assistedFieldFromSaved,
  editAssistedValue,
  emptyAssistedField,
  proposeAssistedValue,
  suggestPointDistances,
  type AssistedField,
} from "./route-plan-assist";
import editorStyles from "./route-plan-editor.module.css";
import { RoutePlanMap } from "./route-plan-map";
import styles from "../trip-forms.module.css";

export type RouteActionState = TripActionState & { success?: boolean };

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

const POINT_FIELDS = ["locationId", "trafficZone", "description"] as const;

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

  const [clientError, setClientError] = useState<string | null>(null);
  const [pointIds, setPointIds] = useState<number[]>(() => {
    if (resolvedRoute?.points && resolvedRoute.points.length > 0) {
      return resolvedRoute.points.map((_, i) => i);
    }
    const count = Math.max(0, Number(state.values?.pointCount ?? 0) || 0);
    return Array.from({ length: count }, (_, i) => i);
  });
  const [detailsIndex, setDetailsIndex] = useState<number | null>(null);
  const [routeDetailsOpen, setRouteDetailsOpen] = useState(false);
  const [snapshotValues, setSnapshotValues] = useState<Record<string, string>>(initialValues);
  const [allLocations, setAllLocations] = useState<TripLocationReference[]>(locations);
  const [distanceField, setDistanceField] = useState<AssistedField>(() =>
    assistedFieldFromSaved(initialValues.distanceKm ?? ""),
  );
  const [durationField, setDurationField] = useState<AssistedField>(() =>
    assistedFieldFromSaved(initialValues.estimatedDurationMinute ?? ""),
  );
  const [pointDistances, setPointDistances] = useState<AssistedField[]>(() =>
    pointIds.map((_, index) =>
      assistedFieldFromSaved(initialValues[`point.${index}.distanceFromStartKm`] ?? ""),
    ),
  );
  const activePointIndex = useRef<number | null>(null);

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
      const index = activePointIndex.current;
      if (index !== null) {
        setSnapshotValues((prev) => ({
          ...prev,
          [`point.${index}.locationId`]: String(detail.location.locationId),
        }));
      }
    }
    window.addEventListener(LOCATION_CREATED_EVENT, handleLocationCreated);
    return () =>
      window.removeEventListener(LOCATION_CREATED_EVENT, handleLocationCreated);
  }, []);

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

  function handleAddPoint() {
    readFormValues();
    const nextId = pointIds.length > 0 ? Math.max(...pointIds) + 1 : 0;
    activePointIndex.current = pointIds.length;
    setPointIds((ids) => [...ids, nextId]);
    setPointDistances((fields) => [...fields, emptyAssistedField()]);
  }

  function handleRemovePoint(indexToRemove: number) {
    const current = readFormValues();
    const nextValues = { ...current };
    for (let index = indexToRemove; index < pointIds.length; index += 1) {
      for (const suffix of POINT_FIELDS) {
        const target = `point.${index}.${suffix}`;
        const source = `point.${index + 1}.${suffix}`;
        if (index + 1 < pointIds.length) nextValues[target] = current[source] ?? "";
        else delete nextValues[target];
      }
    }
    setSnapshotValues(nextValues);
    setPointIds((ids) => ids.filter((_, idx) => idx !== indexToRemove));
    setPointDistances((fields) => fields.filter((_, idx) => idx !== indexToRemove));
    setDetailsIndex((current) => {
      if (current === null) return null;
      if (current === indexToRemove) return null;
      return current > indexToRemove ? current - 1 : current;
    });
  }

  function movePoint(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pointIds.length) return;
    const current = readFormValues();
    const nextValues = { ...current };
    for (const suffix of POINT_FIELDS) {
      const from = `point.${index}.${suffix}`;
      const to = `point.${target}.${suffix}`;
      const stored = nextValues[from] ?? "";
      nextValues[from] = nextValues[to] ?? "";
      nextValues[to] = stored;
    }
    setSnapshotValues(nextValues);
    setPointIds((ids) => {
      const copy = [...ids];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
    setPointDistances((fields) => {
      const copy = [...fields];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
    setDetailsIndex((current) => {
      if (current === index) return target;
      if (current === target) return index;
      return current;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const current = readFormValues();
    const err = validateRouteStep1({
      tripId: current.tripId || value("tripId"),
      routeName: current.routeName || value("routeName"),
    });
    if (err) {
      event.preventDefault();
      setClientError(err);
      return;
    }
    for (let index = 0; index < pointIds.length; index += 1) {
      const locId = current[`point.${index}.locationId`] || value(`point.${index}.locationId`);
      if (!locId.trim()) {
        event.preventDefault();
        setClientError(`لطفاً مکان را برای نقطه ${index + 1} انتخاب کنید.`);
        setDetailsIndex(index);
        return;
      }
    }
    setClientError(null);
  }

  function handleRoute(route: MapRoute | null) {
    if (!route) return;
    setDistanceField((current) => proposeAssistedValue(current, route.distanceKm));
    setDurationField((current) =>
      proposeAssistedValue(current, String(route.durationMinute)),
    );
    setPointDistances((current) => suggestPointDistances(current, route) ?? current);
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

  function locationForPoint(locId?: string) {
    if (!locId) return null;
    return (
      allLocations.find((item) => String(item.locationId) === locId) ??
      (selectedPassenger &&
      String(selectedPassenger.origin.locationId) === locId
        ? selectedPassenger.origin
        : null) ??
      (selectedPassenger &&
      String(selectedPassenger.destination.locationId) === locId
        ? selectedPassenger.destination
        : null)
    );
  }

  const errorNotice =
    clientError ||
    (state.error
      ? tripMessages[state.error as keyof typeof tripMessages] ?? "خطا در ثبت مسیر"
      : null);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      aria-label={
        value("routeId") ? "ویرایش مسیر برنامه‌ریزی‌شده" : "ثبت مسیر برنامه‌ریزی‌شده"
      }
      aria-busy={pending}
      className={styles.routeWizardForm}
    >
      {value("routeId") && (
        <input type="hidden" name="routeId" value={value("routeId")} />
      )}
      <input type="hidden" name="pointCount" value={pointIds.length} readOnly />

      {errorNotice && (
        <InlineNotice tone="danger" role="alert">
          {errorNotice}
        </InlineNotice>
      )}

      <div className={editorStyles.editor}>
        <div className={editorStyles.identity}>
          <FormField>
            <SearchableSelect
              name="tripId"
              label="سفر مسافر"
              options={tripOptions}
              defaultValue={value("tripId")}
              placeholder="انتخاب سفر مسافر"
              searchPlaceholder="جستجوی مسافر، مبدأ یا مقصد…"
              required
              disabled={pending}
              onValueChange={(next) =>
                setSnapshotValues((current) => ({ ...current, tripId: next }))
              }
            />
          </FormField>
          <div className={editorStyles.split}>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-route-name`} required>
                عنوان مسیر
              </FieldLabel>
              <input
                id={`${prefix}-route-name`}
                name="routeName"
                className={formControlClassName}
                defaultValue={value("routeName")}
                disabled={pending}
                aria-describedby={`${prefix}-route-name-hint`}
              />
              <p id={`${prefix}-route-name-hint`} className={editorStyles.fieldHint}>
                برای تشخیص این مسیر از مسیرهای جایگزین
              </p>
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-selected`}>نوع مسیر</FieldLabel>
              <select
                id={`${prefix}-selected`}
                name="isSelected"
                className={formControlClassName}
                defaultValue={value("isSelected") || "false"}
                disabled={pending}
              >
                <option value="true">مسیر اصلی</option>
                <option value="false">مسیر جایگزین</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className={editorStyles.endpoint}>
          <span className={editorStyles.endpointLabel}>مبدأ</span>
          <span className={editorStyles.endpointName}>
            {selectedPassenger?.origin.locationName ?? "—"}
          </span>
        </div>

        <div>
          <p className={editorStyles.sectionLabel}>نقاط میانی</p>
          {pointIds.length === 0 ? (
            <p className={styles.routeStepHelp}>نقطه میانی الزامی نیست.</p>
          ) : (
            <ol className={editorStyles.points}>
              {pointIds.map((id, index) => {
                const locId =
                  snapshotValues[`point.${index}.locationId`] ||
                  value(`point.${index}.locationId`);
                const distance = pointDistances[index] ?? emptyAssistedField();
                return (
                  <li key={id} className={editorStyles.point}>
                    <p className={editorStyles.stopHeading}>
                      <span className={editorStyles.order}>
                        {(index + 1).toLocaleString("fa-IR")}
                      </span>
                      نقطه میانی
                    </p>
                    <LocationPicker
                      name={`point.${index}.locationId`}
                      label="مکان"
                      locations={allLocations}
                      defaultValue={locId}
                      required
                      disabled={pending}
                      layout="stop"
                      onValueChange={(locationId) => {
                        activePointIndex.current = index;
                        setSnapshotValues((current) => ({
                          ...current,
                          [`point.${index}.locationId`]: locationId,
                        }));
                      }}
                      actions={
                        <>
                          <button
                            type="button"
                            className={editorStyles.textButton}
                            aria-expanded={detailsIndex === index}
                            onClick={() =>
                              setDetailsIndex((current) =>
                                current === index ? null : index,
                              )
                            }
                          >
                            جزئیات بیشتر
                          </button>
                          <IconActionGroup>
                            <IconActionButton
                              label="انتقال به بالا"
                              icon={<MoveUpIcon />}
                              disabled={pending || index === 0}
                              onClick={() => movePoint(index, -1)}
                            />
                            <IconActionButton
                              label="انتقال به پایین"
                              icon={<MoveDownIcon />}
                              disabled={pending || index === pointIds.length - 1}
                              onClick={() => movePoint(index, 1)}
                            />
                            <IconActionButton
                              label="حذف"
                              icon={<DeleteIcon />}
                              tone="danger"
                              disabled={pending}
                              onClick={() => handleRemovePoint(index)}
                            />
                          </IconActionGroup>
                        </>
                      }
                    />
                    <input
                      type="hidden"
                      name={`point.${index}.sequenceNo`}
                      value={String(index + 1)}
                    />
                    <div hidden={detailsIndex !== index} className={editorStyles.details}>
                      <FormGrid columns={2}>
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
                            value={distance.value}
                            disabled={pending}
                            onChange={(event) =>
                              setPointDistances((fields) =>
                                fields.map((field, fieldIndex) =>
                                  fieldIndex === index
                                    ? editAssistedValue(field, event.target.value)
                                    : field,
                                ),
                              )
                            }
                          />
                          {distance.suggestion && (
                            <p className={editorStyles.suggestion}>
                              <button
                                type="button"
                                className={editorStyles.textButton}
                                onClick={() =>
                                  setPointDistances((fields) =>
                                    fields.map((field, fieldIndex) =>
                                      fieldIndex === index
                                        ? acceptAssistedSuggestion(field)
                                        : field,
                                    ),
                                  )
                                }
                              >
                                استفاده از مقدار پیشنهادی ({distance.suggestion})
                              </button>
                            </p>
                          )}
                        </FormField>
                        <FormField>
                          <FieldLabel htmlFor={`${prefix}-zone-${id}`}>
                            محدوده ترافیکی
                          </FieldLabel>
                          <input
                            id={`${prefix}-zone-${id}`}
                            name={`point.${index}.trafficZone`}
                            className={formControlClassName}
                            defaultValue={value(`point.${index}.trafficZone`)}
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
                            maxLength={1000}
                            defaultValue={value(`point.${index}.description`)}
                            disabled={pending}
                          />
                        </FormField>
                      </FormGrid>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={handleAddPoint}
          >
            + افزودن نقطه میانی
          </ActionButton>
        </div>

        <div className={editorStyles.endpoint}>
          <span className={editorStyles.endpointLabel}>مقصد</span>
          <span className={editorStyles.endpointName}>
            {selectedPassenger?.destination.locationName ?? "—"}
          </span>
        </div>

        <div className={editorStyles.mapColumn}>
          <RoutePlanMap
            origin={selectedPassenger?.origin ?? null}
            destination={selectedPassenger?.destination ?? null}
            intermediates={pointIds.map((_, index) => ({
              location: locationForPoint(
                snapshotValues[`point.${index}.locationId`] ||
                  value(`point.${index}.locationId`),
              ),
            }))}
            onRoute={handleRoute}
          />
        </div>

        <div className={editorStyles.estimates}>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-distance`}>مسافت (کیلومتر)</FieldLabel>
            <input
              id={`${prefix}-distance`}
              name="distanceKm"
              className={formControlClassName}
              inputMode="decimal"
              dir="ltr"
              value={distanceField.value}
              disabled={pending}
              onChange={(event) =>
                setDistanceField((current) =>
                  editAssistedValue(current, event.target.value),
                )
              }
            />
            {distanceField.suggestion && (
              <p className={editorStyles.suggestion}>
                <button
                  type="button"
                  className={editorStyles.textButton}
                  onClick={() =>
                    setDistanceField((current) => acceptAssistedSuggestion(current))
                  }
                >
                  استفاده از مقدار پیشنهادی ({distanceField.suggestion})
                </button>
              </p>
            )}
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-duration`}>مدت تخمینی (دقیقه)</FieldLabel>
            <input
              id={`${prefix}-duration`}
              name="estimatedDurationMinute"
              className={formControlClassName}
              inputMode="numeric"
              dir="ltr"
              value={durationField.value}
              disabled={pending}
              onChange={(event) =>
                setDurationField((current) =>
                  editAssistedValue(current, event.target.value),
                )
              }
            />
            {durationField.suggestion && (
              <p className={editorStyles.suggestion}>
                <button
                  type="button"
                  className={editorStyles.textButton}
                  onClick={() =>
                    setDurationField((current) => acceptAssistedSuggestion(current))
                  }
                >
                  استفاده از مقدار پیشنهادی ({durationField.suggestion})
                </button>
              </p>
            )}
          </FormField>
        </div>

        <div>
          <button
            type="button"
            className={editorStyles.textButton}
            aria-expanded={routeDetailsOpen}
            onClick={() => setRouteDetailsOpen((open) => !open)}
          >
            جزئیات بیشتر
          </button>
          <div hidden={!routeDetailsOpen} className={editorStyles.details}>
            <FormGrid columns={2}>
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
              <FormField className={styles.fullSpan}>
                <FieldLabel htmlFor={`${prefix}-route-description`}>
                  توضیحات مسیر
                </FieldLabel>
                <textarea
                  id={`${prefix}-route-description`}
                  name="routeDescription"
                  className={formControlClassName}
                  rows={2}
                  maxLength={1000}
                  defaultValue={value("routeDescription")}
                  disabled={pending}
                />
              </FormField>
            </FormGrid>
          </div>
        </div>
      </div>

      <div className={styles.routeWizardFooter}>
        <div className={styles.routeWizardFooterPrimary}>
          <ActionButton type="submit" disabled={pending} pending={pending}>
            {pending
              ? "در حال ثبت…"
              : value("routeId")
                ? "ذخیره تغییرات مسیر"
                : "ذخیره مسیر"}
          </ActionButton>
        </div>
        {onCancel && (
          <div className={styles.routeWizardFooterSecondary}>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onCancel}
            >
              انصراف
            </ActionButton>
          </div>
        )}
      </div>
    </form>
  );
}
