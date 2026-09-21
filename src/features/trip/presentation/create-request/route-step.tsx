"use client";

import { useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
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
import { LocationPicker } from "../location/location-picker";
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
  const [nextPointKey, setNextPointKey] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const dialogTitleId = useId();
  if (hidden) return null;

  function resetEditor() {
    setPassengerKey(passengers[0]?.key ?? 0);
    setPointKeys([]);
    setNextPointKey(1);
    setError(null);
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
                    label={route.isSelected ? "مسیر انتخاب‌شده" : "مسیر جایگزین"}
                    tone={route.isSelected ? "positive" : "info"}
                  />
                </div>
                <p>{route.points.length ? `${route.points.length} نقطه مسیر` : "بدون نقطه مسیر"}</p>
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
                <FieldLabel htmlFor={`${dialogTitleId}-route-name`} required>نام مسیر</FieldLabel>
                <input id={`${dialogTitleId}-route-name`} name="routeName" className={formControlClassName} placeholder="مثلاً: مسیر اصلی یا جایگزین" />
              </FormField>
            </FormGrid>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>تنظیمات مسیر</h3>
            <FormGrid columns={2}>
              <FormField>
                <FieldLabel htmlFor={`${dialogTitleId}-selected`}>وضعیت انتخاب</FieldLabel>
                <select id={`${dialogTitleId}-selected`} name="isSelected" className={formControlClassName} defaultValue="true">
                  <option value="true">مسیر انتخاب‌شده</option>
                  <option value="false">مسیر جایگزین</option>
                </select>
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${dialogTitleId}-alternative`}>شماره مسیر جایگزین</FieldLabel>
                <input id={`${dialogTitleId}-alternative`} name="alternativeNo" inputMode="numeric" dir="ltr" className={formControlClassName} />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${dialogTitleId}-distance`}>مسافت (کیلومتر)</FieldLabel>
                <input id={`${dialogTitleId}-distance`} name="distanceKm" inputMode="decimal" dir="ltr" className={formControlClassName} />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${dialogTitleId}-duration`}>مدت تخمینی (دقیقه)</FieldLabel>
                <input id={`${dialogTitleId}-duration`} name="estimatedDurationMinute" inputMode="numeric" dir="ltr" className={formControlClassName} />
              </FormField>
            </FormGrid>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>توضیحات</h3>
            <FormField>
              <FieldLabel htmlFor={`${dialogTitleId}-description`}>توضیحات مسیر</FieldLabel>
              <input id={`${dialogTitleId}-description`} name="routeDescription" className={formControlClassName} placeholder="توضیحات تکمیلی درباره شرایط یا الزامات مسیر…" />
            </FormField>
          </section>

          <section className={styles.modalSection}>
            <div className={styles.routePointsHeader}>
              <div>
                <h3 className={styles.modalSectionTitle}>نقاط مسیر</h3>
                <p className={styles.muted}>در صورت نیاز می‌توانید نقاط میانی مسیر را اضافه کنید.</p>
              </div>
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPointKeys((current) => [...current, nextPointKey]);
                  setNextPointKey((current) => current + 1);
                }}
              >
                + افزودن نقطه
              </ActionButton>
            </div>

            {pointKeys.length === 0 ? (
              <p className={styles.compactPointsEmpty}>هنوز نقطه‌ای به مسیر اضافه نشده است.</p>
            ) : (
              <div className={styles.routePointsEditorList}>
                {pointKeys.map((pointKey, index) => (
                  <article key={pointKey} className={styles.pointCard}>
                    <div className={styles.pointCardHeader}>
                      <h4>نقطه {index + 1}</h4>
                      <ActionButton type="button" variant="secondary" size="sm" onClick={() => setPointKeys((current) => current.filter((key) => key !== pointKey))}>حذف نقطه</ActionButton>
                    </div>
                    <FormGrid columns={2}>
                      <LocationPicker name={`point.${index}.locationId`} label="مکان" locations={locations} required />
                      <FormField>
                        <FieldLabel htmlFor={`${dialogTitleId}-sequence-${pointKey}`}>ترتیب</FieldLabel>
                        <input id={`${dialogTitleId}-sequence-${pointKey}`} name={`point.${index}.sequenceNo`} defaultValue={index + 1} inputMode="numeric" dir="ltr" className={formControlClassName} />
                      </FormField>
                      <FormField>
                        <FieldLabel htmlFor={`${dialogTitleId}-point-distance-${pointKey}`}>فاصله از شروع (کیلومتر)</FieldLabel>
                        <input id={`${dialogTitleId}-point-distance-${pointKey}`} name={`point.${index}.distanceFromStartKm`} inputMode="decimal" dir="ltr" className={formControlClassName} />
                      </FormField>
                      <FormField>
                        <FieldLabel htmlFor={`${dialogTitleId}-zone-${pointKey}`}>محدوده ترافیکی</FieldLabel>
                        <input id={`${dialogTitleId}-zone-${pointKey}`} name={`point.${index}.trafficZone`} className={formControlClassName} />
                      </FormField>
                      <div className={styles.spanFull}>
                        <FormField>
                          <FieldLabel htmlFor={`${dialogTitleId}-point-description-${pointKey}`}>توضیحات نقطه</FieldLabel>
                          <input id={`${dialogTitleId}-point-description-${pointKey}`} name={`point.${index}.description`} className={formControlClassName} />
                        </FormField>
                      </div>
                    </FormGrid>
                  </article>
                ))}
              </div>
            )}
          </section>

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
