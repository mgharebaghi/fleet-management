"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import type {
  TripLocationReference,
  TripPassengerRecord,
} from "../application/trip-records";
import { addTripRouteAction } from "./trip.actions";
import { tripMessages } from "./trip-form-data";
import { LocationPicker } from "./location/location-picker";
import styles from "./trip-forms.module.css";

export function TripRouteForm({
  tripRequestId,
  passengers,
  locations,
}: {
  tripRequestId: number;
  passengers: TripPassengerRecord[];
  locations: TripLocationReference[];
}) {
  const [state, formAction, pending] = useActionState(
    addTripRouteAction.bind(null, tripRequestId),
    {},
  );
  const prefix = useId();
  const [pointCount, setPointCount] = useState(
    Math.max(1, Number(state.values?.pointCount ?? 1) || 1),
  );
  const value = (name: string) => state.values?.[name] ?? "";
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
  return (
    <form
      action={formAction}
      noValidate
      aria-label="ثبت مسیر برنامه‌ریزی‌شده"
      aria-busy={pending}
      className={styles.detailForm}
    >
      <h3>افزودن مسیر برنامه‌ریزی‌شده</h3>
      <p className={styles.hint}>
        مبدأ، مقصد و نقاط میانی را به ترتیب ثبت کنید. انتخاب «مسیر انتخاب‌شده»
        بقیهٔ مسیرهای برنامه‌ریزی‌شدهٔ همان مسافر را از انتخاب خارج می‌کند.
        انحراف مسیر و توقف واقعی روی برگهٔ مأموریت نوشته می‌شود، نه در این فرم.
      </p>
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <FormGrid>
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
          />
        </FormField>
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
      </FormGrid>
      <FormField>
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

      <div className={styles.passengerHeader}>
        <h3>نقاط مسیر</h3>
        <ActionButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => setPointCount((count) => count + 1)}
        >
          افزودن نقطه
        </ActionButton>
      </div>
      <input type="hidden" name="pointCount" value={pointCount} readOnly />
      <div className={styles.pointList}>
        {Array.from({ length: pointCount }, (_, index) => (
          <div className={styles.point} key={index}>
            <div className={styles.passengerHeader}>
              <strong>نقطه {index + 1}</strong>
              {pointCount > 1 && index === pointCount - 1 && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    setPointCount((count) => Math.max(1, count - 1))
                  }
                >
                  حذف
                </ActionButton>
              )}
            </div>
            <FormGrid>
              <FormField>
                <LocationPicker
                  name={`point.${index}.locationId`}
                  label="مکان"
                  locations={locations}
                  defaultValue={value(`point.${index}.locationId`)}
                  required
                  disabled={pending}
                />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-sequence-${index}`}>
                  ترتیب
                </FieldLabel>
                <input
                  id={`${prefix}-sequence-${index}`}
                  name={`point.${index}.sequenceNo`}
                  className={formControlClassName}
                  inputMode="numeric"
                  dir="ltr"
                  defaultValue={
                    value(`point.${index}.sequenceNo`) || String(index + 1)
                  }
                  disabled={pending}
                />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-point-distance-${index}`}>
                  فاصله از شروع (کیلومتر)
                </FieldLabel>
                <input
                  id={`${prefix}-point-distance-${index}`}
                  name={`point.${index}.distanceFromStartKm`}
                  className={formControlClassName}
                  inputMode="decimal"
                  dir="ltr"
                  defaultValue={value(
                    `point.${index}.distanceFromStartKm`,
                  )}
                  disabled={pending}
                />
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-traffic-${index}`}>
                  محدودهٔ ترافیکی
                </FieldLabel>
                <input
                  id={`${prefix}-traffic-${index}`}
                  name={`point.${index}.trafficZone`}
                  className={formControlClassName}
                  defaultValue={value(`point.${index}.trafficZone`)}
                  disabled={pending}
                />
              </FormField>
            </FormGrid>
            <FormField>
              <FieldLabel htmlFor={`${prefix}-point-description-${index}`}>
                توضیحات نقطه
              </FieldLabel>
              <input
                id={`${prefix}-point-description-${index}`}
                name={`point.${index}.description`}
                className={formControlClassName}
                defaultValue={value(`point.${index}.description`)}
                disabled={pending}
              />
            </FormField>
          </div>
        ))}
      </div>
      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending ? "در حال ثبت…" : "ثبت مسیر"}
        </ActionButton>
      </FormActions>
    </form>
  );
}
