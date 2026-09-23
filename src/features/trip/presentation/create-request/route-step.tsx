"use client";

import { useEffect, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { IconActionButton, IconActionGroup } from "@/components/ui/icon-action-button/icon-action-button";
import { DeleteIcon, MoveDownIcon, MoveUpIcon } from "@/components/ui/icon/icons";
import { Dialog } from "@/components/ui/dialog/dialog";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { TripLocationReference } from "../../application/trip-records";
import {
  LOCATION_CREATED_EVENT,
  LocationPicker,
} from "../location/location-picker";
import type { MapRoute } from "../../../../maps/map-route";
import {
  acceptAssistedSuggestion,
  editAssistedValue,
  emptyAssistedField,
  proposeAssistedValue,
  suggestPointDistances,
  type AssistedField,
} from "../route/route-plan-assist";
import editorStyles from "../route/route-plan-editor.module.css";
import { RoutePlanMap } from "../route/route-plan-map";
import {
  routePointLocationError,
  type CreateWizardPassenger,
  type CreateWizardRoute,
} from "./create-wizard";
import styles from "./create-trip.module.css";

function optionalInteger(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  return /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

type RouteStepProps = {
  hidden: boolean;
  passengers: CreateWizardPassenger[];
  locations: TripLocationReference[];
  routes: CreateWizardRoute[];
  onRoutesChange: (routes: CreateWizardRoute[]) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
};

export function RouteStep({
  hidden,
  passengers,
  locations,
  routes,
  onRoutesChange,
  onBack,
  onNext,
  nextLabel = "بعدی: برنامه‌ریزی",
}: RouteStepProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passengerKey, setPassengerKey] = useState(passengers[0]?.key ?? 0);
  const [pointKeys, setPointKeys] = useState<number[]>([]);
  const [pointLocationIds, setPointLocationIds] = useState<Record<number, string>>(
    {},
  );
  const [catalog, setCatalog] = useState(locations);
  const [nextPointKey, setNextPointKey] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [detailsKey, setDetailsKey] = useState<number | null>(null);
  const [routeDetailsOpen, setRouteDetailsOpen] = useState(false);
  const [distanceField, setDistanceField] = useState<AssistedField>(emptyAssistedField);
  const [durationField, setDurationField] = useState<AssistedField>(emptyAssistedField);
  const [pointDistances, setPointDistances] = useState<Record<number, AssistedField>>({});
  const dialogTitleId = useId();

  useEffect(() => {
    function rememberLocation(event: Event) {
      const location = (
        event as CustomEvent<{ location?: TripLocationReference }>
      ).detail?.location;
      if (!location) return;
      setCatalog((current) =>
        current.some((item) => item.locationId === location.locationId)
          ? current
          : [...current, location],
      );
    }
    window.addEventListener(LOCATION_CREATED_EVENT, rememberLocation);
    return () =>
      window.removeEventListener(LOCATION_CREATED_EVENT, rememberLocation);
  }, []);

  if (hidden) return null;

  function resetEditor() {
    setPassengerKey(passengers[0]?.key ?? 0);
    setPointKeys([]);
    setPointLocationIds({});
    setNextPointKey(1);
    setDetailsKey(null);
    setRouteDetailsOpen(false);
    setDistanceField(emptyAssistedField());
    setDurationField(emptyAssistedField());
    setPointDistances({});
    setError(null);
  }

  function handleRoute(route: MapRoute | null) {
    if (!route) return;
    setDistanceField((current) => proposeAssistedValue(current, route.distanceKm));
    setDurationField((current) =>
      proposeAssistedValue(current, String(route.durationMinute)),
    );
    setPointDistances((current) => {
      const fields = pointKeys.map(
        (key) => current[key] ?? emptyAssistedField(),
      );
      const next = suggestPointDistances(fields, route);
      if (!next) return current;
      return Object.fromEntries(pointKeys.map((key, index) => [key, next[index]]));
    });
  }

  function movePoint(index: number, direction: -1 | 1) {
    const target = index + direction;
    setPointKeys((current) => {
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function saveRoute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const routeName = String(data.get("routeName") ?? "").trim();
    if (!routeName) {
      setError("نام مسیر را وارد کنید.");
      return;
    }
    const points = pointKeys.map((_, index) => ({
      locationId: Number(data.get(`point.${index}.locationId`)),
      trafficZone: optionalText(data.get(`point.${index}.trafficZone`)),
      sequenceNo: optionalInteger(data.get(`point.${index}.sequenceNo`)),
      distanceFromStartKm: optionalText(data.get(`point.${index}.distanceFromStartKm`)),
      description: optionalText(data.get(`point.${index}.description`)),
    }));
    const pointError = routePointLocationError(points);
    if (pointError) {
      setError(pointError);
      return;
    }

    onRoutesChange([
      ...routes,
      {
        key: `route-${Date.now()}-${routes.length}`,
        passengerKey,
        routeName,
        alternativeNo: optionalInteger(data.get("alternativeNo")),
        distanceKm: optionalText(data.get("distanceKm")),
        estimatedDurationMinute: optionalInteger(data.get("estimatedDurationMinute")),
        isSelected: data.get("isSelected") === "true",
        description: optionalText(data.get("routeDescription")),
        points,
      },
    ]);
    setDialogOpen(false);
    resetEditor();
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <div>
          <h2>مسیر سفر (اختیاری)</h2>
          <p className={styles.stepDescription}>
            می‌توانید این مرحله را رد کنید، یا یک مسیر با صفر یا چند نقطه برای هر مسافر تعریف کنید.
          </p>
        </div>
        <ActionButton type="button" onClick={() => setDialogOpen(true)}>
          {routes.length ? "افزودن مسیر دیگر" : "افزودن مسیر"}
        </ActionButton>
      </div>

      {routes.length === 0 ? (
        <InlineNotice tone="info" role="status">
          هنوز مسیری به برنامه اضافه نشده است. ثبت مسیر برای ادامه الزامی نیست.
        </InlineNotice>
      ) : (
        <div className={styles.routeList}>
          {routes.map((route) => {
            const passenger = passengers.find((item) => item.key === route.passengerKey);
            return (
              <article key={route.key} className={styles.groupCard}>
                <div className={styles.summaryHeader}>
                  <div>
                    <h3>{route.routeName}</h3>
                    <p className={styles.muted}>مسافر: {passenger?.personName ?? "—"}</p>
                  </div>
                  <StatusBadge
                    label={route.isSelected ? "مسیر اصلی" : "مسیر جایگزین"}
                    tone={route.isSelected ? "positive" : "info"}
                  />
                </div>
                <p className={styles.muted}>
                  {route.distanceKm ? `${route.distanceKm} کیلومتر` : "مسافت ثبت نشده"}
                  {" · "}
                  {route.estimatedDurationMinute
                    ? `${route.estimatedDurationMinute} دقیقه`
                    : "مدت ثبت نشده"}
                  {" · "}
                  {route.points.length ? `${route.points.length} نقطه میانی` : "بدون نقطه میانی"}
                </p>
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRoutesChange(routes.filter((item) => item.key !== route.key))}
                >
                  حذف مسیر
                </ActionButton>
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          resetEditor();
        }}
        titleId={dialogTitleId}
        title="افزودن مسیر برنامه‌ریزی‌شده"
        description="مسیر و نقاط اختیاری آن تا ثبت نهایی فقط در فرم نگه‌داری می‌شوند."
        size="wide"
      >
        <form onSubmit={saveRoute} className={styles.routeDraftForm}>
          {error && <InlineNotice tone="danger" role="alert">{error}</InlineNotice>}

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>مشخصات مسیر</h3>
            <FormGrid columns={2}>
              <SearchableSelect
                name="passengerKey"
                label="مسافر"
                options={passengers.map((passenger) => ({
                  value: String(passenger.key),
                  label: passenger.personName,
                  searchText: `${passenger.personName} ${passenger.originName} ${passenger.destinationName}`,
                  content: <span>{passenger.personName} — {passenger.originName} ← {passenger.destinationName}</span>,
                }))}
                defaultValue={String(passengerKey)}
                required
                onValueChange={(value) => setPassengerKey(Number(value))}
              />
              <FormField>
                <FieldLabel htmlFor={`${dialogTitleId}-route-name`} required>عنوان مسیر</FieldLabel>
                <input
                  id={`${dialogTitleId}-route-name`}
                  name="routeName"
                  className={formControlClassName}
                  placeholder="مثلاً: مسیر اصلی یا جایگزین"
                  aria-describedby={`${dialogTitleId}-route-name-hint`}
                />
                <p id={`${dialogTitleId}-route-name-hint`} className={editorStyles.fieldHint}>
                  برای تشخیص این مسیر از مسیرهای جایگزین
                </p>
              </FormField>
            </FormGrid>
          </section>

          <div className={editorStyles.editor}>
          <FormField>
            <FieldLabel htmlFor={`${dialogTitleId}-selected`}>نوع مسیر</FieldLabel>
            <select id={`${dialogTitleId}-selected`} name="isSelected" className={formControlClassName} defaultValue="true">
              <option value="true">مسیر اصلی</option>
              <option value="false">مسیر جایگزین</option>
            </select>
          </FormField>

          {(() => {
            const passenger = passengers.find((item) => item.key === passengerKey);
            return (
              <>
                <div className={editorStyles.endpoint}>
                  <span className={editorStyles.endpointLabel}>مبدأ</span>
                  <span className={editorStyles.endpointName}>{passenger?.originName ?? "—"}</span>
                </div>
                <div>
                  <p className={editorStyles.sectionLabel}>نقاط میانی</p>
                  {pointKeys.length === 0 ? (
                    <p className={styles.muted}>نقطه میانی الزامی نیست.</p>
                  ) : (
                    <ol className={editorStyles.points}>
                      {pointKeys.map((pointKey, index) => {
                        const distance = pointDistances[pointKey] ?? emptyAssistedField();
                        return (
                          <li key={pointKey} className={editorStyles.point}>
                            <p className={editorStyles.stopHeading}>
                              <span className={editorStyles.order}>{(index + 1).toLocaleString("fa-IR")}</span>
                              نقطه میانی
                            </p>
                            <LocationPicker
                              name={`point.${index}.locationId`}
                              label="مکان"
                              locations={catalog}
                              required
                              layout="stop"
                              onValueChange={(locationId) =>
                                setPointLocationIds((current) => ({
                                  ...current,
                                  [pointKey]: locationId,
                                }))
                              }
                              actions={
                                <>
                                  <button
                                    type="button"
                                    className={editorStyles.textButton}
                                    aria-expanded={detailsKey === pointKey}
                                    onClick={() =>
                                      setDetailsKey((current) =>
                                        current === pointKey ? null : pointKey,
                                      )
                                    }
                                  >
                                    جزئیات بیشتر
                                  </button>
                                  <IconActionGroup>
                                    <IconActionButton
                                      label="انتقال به بالا"
                                      icon={<MoveUpIcon />}
                                      disabled={index === 0}
                                      onClick={() => movePoint(index, -1)}
                                    />
                                    <IconActionButton
                                      label="انتقال به پایین"
                                      icon={<MoveDownIcon />}
                                      disabled={index === pointKeys.length - 1}
                                      onClick={() => movePoint(index, 1)}
                                    />
                                    <IconActionButton
                                      label="حذف"
                                      icon={<DeleteIcon />}
                                      tone="danger"
                                      onClick={() => {
                                        setPointKeys((current) => current.filter((key) => key !== pointKey));
                                        setPointLocationIds((current) => {
                                          const next = { ...current };
                                          delete next[pointKey];
                                          return next;
                                        });
                                        setPointDistances((current) => {
                                          const next = { ...current };
                                          delete next[pointKey];
                                          return next;
                                        });
                                      }}
                                    />
                                  </IconActionGroup>
                                </>
                              }
                            />
                            <input type="hidden" name={`point.${index}.sequenceNo`} value={String(index + 1)} />
                            <div hidden={detailsKey !== pointKey} className={editorStyles.details}>
                              <FormGrid columns={2}>
                                <FormField>
                                  <FieldLabel htmlFor={`${dialogTitleId}-point-distance-${pointKey}`}>فاصله از شروع (کیلومتر)</FieldLabel>
                                  <input
                                    id={`${dialogTitleId}-point-distance-${pointKey}`}
                                    name={`point.${index}.distanceFromStartKm`}
                                    inputMode="decimal"
                                    dir="ltr"
                                    className={formControlClassName}
                                    value={distance.value}
                                    onChange={(event) =>
                                      setPointDistances((current) => ({
                                        ...current,
                                        [pointKey]: editAssistedValue(distance, event.target.value),
                                      }))
                                    }
                                  />
                                  {distance.suggestion && (
                                    <p className={editorStyles.suggestion}>
                                      <button
                                        type="button"
                                        className={editorStyles.textButton}
                                        onClick={() =>
                                          setPointDistances((current) => ({
                                            ...current,
                                            [pointKey]: acceptAssistedSuggestion(distance),
                                          }))
                                        }
                                      >
                                        استفاده از مقدار پیشنهادی ({distance.suggestion})
                                      </button>
                                    </p>
                                  )}
                                </FormField>
                                <FormField>
                                  <FieldLabel htmlFor={`${dialogTitleId}-zone-${pointKey}`}>محدوده ترافیکی</FieldLabel>
                                  <input id={`${dialogTitleId}-zone-${pointKey}`} name={`point.${index}.trafficZone`} className={formControlClassName} />
                                </FormField>
                                <div className={styles.spanFull}>
                                  <FormField>
                                    <FieldLabel htmlFor={`${dialogTitleId}-point-description-${pointKey}`}>توضیحات نقطه</FieldLabel>
                                    <input id={`${dialogTitleId}-point-description-${pointKey}`} name={`point.${index}.description`} maxLength={1000} className={formControlClassName} />
                                  </FormField>
                                </div>
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
                    onClick={() => {
                      setPointKeys((current) => [...current, nextPointKey]);
                      setPointDistances((current) => ({
                        ...current,
                        [nextPointKey]: emptyAssistedField(),
                      }));
                      setNextPointKey((current) => current + 1);
                    }}
                  >
                    + افزودن نقطه میانی
                  </ActionButton>
                </div>
                <div className={editorStyles.endpoint}>
                  <span className={editorStyles.endpointLabel}>مقصد</span>
                  <span className={editorStyles.endpointName}>{passenger?.destinationName ?? "—"}</span>
                </div>
                {dialogOpen && (
                  <div className={editorStyles.mapColumn}>
                    <RoutePlanMap
                      origin={passenger?.originLocation ?? null}
                      destination={passenger?.destinationLocation ?? null}
                      intermediates={pointKeys.map((pointKey) => ({
                        location:
                          catalog.find(
                            (item) => String(item.locationId) === pointLocationIds[pointKey],
                          ) ?? null,
                      }))}
                      onRoute={handleRoute}
                    />
                  </div>
                )}
              </>
            );
          })()}

          <div className={editorStyles.estimates}>
            <FormField>
              <FieldLabel htmlFor={`${dialogTitleId}-distance`}>مسافت (کیلومتر)</FieldLabel>
              <input
                id={`${dialogTitleId}-distance`}
                name="distanceKm"
                inputMode="decimal"
                dir="ltr"
                className={formControlClassName}
                value={distanceField.value}
                onChange={(event) =>
                  setDistanceField((current) => editAssistedValue(current, event.target.value))
                }
              />
              {distanceField.suggestion && (
                <p className={editorStyles.suggestion}>
                  <button
                    type="button"
                    className={editorStyles.textButton}
                    onClick={() => setDistanceField((current) => acceptAssistedSuggestion(current))}
                  >
                    استفاده از مقدار پیشنهادی ({distanceField.suggestion})
                  </button>
                </p>
              )}
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${dialogTitleId}-duration`}>مدت تخمینی (دقیقه)</FieldLabel>
              <input
                id={`${dialogTitleId}-duration`}
                name="estimatedDurationMinute"
                inputMode="numeric"
                dir="ltr"
                className={formControlClassName}
                value={durationField.value}
                onChange={(event) =>
                  setDurationField((current) => editAssistedValue(current, event.target.value))
                }
              />
              {durationField.suggestion && (
                <p className={editorStyles.suggestion}>
                  <button
                    type="button"
                    className={editorStyles.textButton}
                    onClick={() => setDurationField((current) => acceptAssistedSuggestion(current))}
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
                  <FieldLabel htmlFor={`${dialogTitleId}-alternative`}>شمارهٔ مسیر جایگزین</FieldLabel>
                  <input id={`${dialogTitleId}-alternative`} name="alternativeNo" inputMode="numeric" dir="ltr" className={formControlClassName} />
                </FormField>
                <FormField className={styles.spanFull}>
                  <FieldLabel htmlFor={`${dialogTitleId}-description`}>توضیحات مسیر</FieldLabel>
                  <input id={`${dialogTitleId}-description`} name="routeDescription" maxLength={1000} className={formControlClassName} />
                </FormField>
              </FormGrid>
            </div>
          </div>
          </div>

          <FormActions>
            <ActionButton type="button" variant="secondary" onClick={() => { setDialogOpen(false); resetEditor(); }}>انصراف</ActionButton>
            <ActionButton type="submit">افزودن به برنامه سفر</ActionButton>
          </FormActions>
        </form>
      </Dialog>

      <div className={styles.stepActions}>
        <FormActions>
          <ActionButton type="button" variant="secondary" onClick={onBack}>قبلی: راننده و خودرو</ActionButton>
          <ActionButton type="button" onClick={onNext}>{nextLabel}</ActionButton>
        </FormActions>
      </div>
    </div>
  );
}
