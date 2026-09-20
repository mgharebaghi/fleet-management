"use client";

import { useState } from "react";

import { JalaliDatePicker } from "../../../../components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
  FormField,
  formControlClassName,
} from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { SearchableSelect } from "../../../../components/ui/searchable-select/searchable-select";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { TimeSelect } from "../../../../components/ui/time-select/time-select";
import type {
  TripLocationReference,
  TripPersonReference,
} from "../../application/trip-records";
import { LocationPicker } from "../location/location-picker";
import styles from "./create-trip.module.css";

export function PassengerEditor({
  index,
  prefix,
  pending,
  people,
  locations,
  passengerCount,
  shareOrigin,
  shareDestination,
  value,
  fieldInvalid,
}: {
  index: number;
  prefix: string;
  pending: boolean;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  passengerCount: number;
  shareOrigin: boolean;
  shareDestination: boolean;
  value: (name: string) => string;
  fieldInvalid: (name: string) => boolean;
}) {
  const personOptions = people.map((person) => ({
    value: String(person.personId),
    label: `${person.firstName} ${person.lastName} ${person.personnelNo ?? ""}`,
    searchText: `${person.firstName} ${person.lastName} ${person.personnelNo ?? ""} ${person.mobile ?? ""}`,
    content: (
      <span>
        {person.firstName} {person.lastName}
        {person.personnelNo && (
          <>
            {" — "}
            <TechnicalValue>{person.personnelNo}</TechnicalValue>
          </>
        )}
      </span>
    ),
  }));
  const inheritedRouteHelp =
    shareOrigin && shareDestination
      ? "مبدأ و مقصد از اطلاعات درخواست استفاده می‌شود."
      : shareOrigin
        ? "مبدأ از اطلاعات درخواست استفاده می‌شود."
        : shareDestination
          ? "مقصد از اطلاعات درخواست استفاده می‌شود."
          : null;
  const pickupOverrideName = `passenger.${index}.pickupOverride`;
  const [pickupOverride, setPickupOverride] = useState(
    () => value(pickupOverrideName) === "true",
  );

  return (
    <article
      className={styles.passengerEditor}
      aria-label={`اطلاعات مسافر ${index + 1}`}
    >
      <FormField>
        <SearchableSelect
          name={`passenger.${index}.personId`}
          label="مسافر"
          options={personOptions}
          defaultValue={value(`passenger.${index}.personId`)}
          placeholder="انتخاب کنید"
          searchPlaceholder="جستجوی نام، شماره پرسنلی یا موبایل…"
          disabled={pending}
          required
          invalid={fieldInvalid(`passenger.${index}.personId`)}
        />
      </FormField>

      {inheritedRouteHelp && (
        <p className={styles.passengerHelp}>{inheritedRouteHelp}</p>
      )}

      {(!shareOrigin || !shareDestination) && (
        <FormGrid columns={12}>
          {!shareOrigin && (
            <FormField className={styles.passengerRouteField}>
              <LocationPicker
                name={`passenger.${index}.originLocationId`}
                label="مبدأ"
                locations={locations}
                defaultValue={value(`passenger.${index}.originLocationId`)}
                disabled={pending}
                required
                invalid={fieldInvalid(`passenger.${index}.originLocationId`)}
              />
            </FormField>
          )}
          {!shareDestination && (
            <FormField className={styles.passengerRouteField}>
              <LocationPicker
                name={`passenger.${index}.destinationLocationId`}
                label="مقصد"
                locations={locations}
                defaultValue={value(
                  `passenger.${index}.destinationLocationId`,
                )}
                disabled={pending}
                required
                invalid={fieldInvalid(
                  `passenger.${index}.destinationLocationId`,
                )}
              />
            </FormField>
          )}
        </FormGrid>
      )}

      <fieldset className={styles.passengerPickupGroup}>
        <legend>زمان سوارشدن درخواستی</legend>
        <input
          type="hidden"
          name={pickupOverrideName}
          value={pickupOverride ? "true" : ""}
          readOnly
        />
        <label className={styles.passengerPickupToggle}>
          <input
            type="checkbox"
            checked={pickupOverride}
            disabled={pending}
            onChange={(event) => setPickupOverride(event.currentTarget.checked)}
          />
          <span>زمان سوارشدن متفاوت از زمان درخواست</span>
        </label>
        <p className={styles.passengerHelp}>
          در حالت عادی، زمان سوارشدن همین مسافر از زمان درخواست سفر استفاده
          می‌کند.
        </p>
        <div className={styles.passengerPickupControls} hidden={!pickupOverride}>
          <JalaliDatePicker
            name={`passenger.${index}.pickupDay`}
            label="تاریخ (شمسی)"
            defaultValue={value(`passenger.${index}.pickupDay`)}
            disabled={pending || !pickupOverride}
          />
          <TimeSelect
            id={`${prefix}-pickup-time-${index}`}
            name={`passenger.${index}.pickupTime`}
            label="ساعت"
            defaultValue={value(`passenger.${index}.pickupTime`)}
            disabled={pending || !pickupOverride}
          />
        </div>
      </fieldset>

      {passengerCount > 1 && (
        <FormGrid>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-pickup-order-${index}`}>
              ترتیب سوارشدن
            </FieldLabel>
            <input
              id={`${prefix}-pickup-order-${index}`}
              name={`passenger.${index}.pickupOrder`}
              className={formControlClassName}
              inputMode="numeric"
              dir="ltr"
              defaultValue={value(`passenger.${index}.pickupOrder`)}
              disabled={pending}
            />
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-dropoff-order-${index}`}>
              ترتیب پیاده‌شدن
            </FieldLabel>
            <input
              id={`${prefix}-dropoff-order-${index}`}
              name={`passenger.${index}.dropoffOrder`}
              className={formControlClassName}
              inputMode="numeric"
              dir="ltr"
              defaultValue={value(`passenger.${index}.dropoffOrder`)}
              disabled={pending}
            />
          </FormField>
        </FormGrid>
      )}

      <FormField>
        <FieldLabel htmlFor={`${prefix}-trip-description-${index}`}>
          توضیحات این مسافر
        </FieldLabel>
        <textarea
          id={`${prefix}-trip-description-${index}`}
          name={`passenger.${index}.description`}
          className={formControlClassName}
          rows={3}
          defaultValue={value(`passenger.${index}.description`)}
          disabled={pending}
        />
      </FormField>
    </article>
  );
}
