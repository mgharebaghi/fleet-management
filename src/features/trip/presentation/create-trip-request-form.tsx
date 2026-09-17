"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { JalaliDatePicker } from "@/components/ui/date-picker/jalali-date-picker";
import {
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { TimeSelect } from "@/components/ui/time-select/time-select";
import type {
  TripLocationReference,
  TripPersonReference,
  TripRequestTypeReference,
} from "../application/trip-records";
import { createTripRequestAction } from "./trip.actions";
import { tripMessages } from "./trip-form-data";
import styles from "./trip-forms.module.css";

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
  const [passengerCount, setPassengerCount] = useState(1);

  const value = (name: string) => state.values?.[name] ?? "";
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
  const locationOptions = locations.map((location) => ({
    value: String(location.locationId),
    label: `${location.locationName} ${location.locationCode ?? ""} ${location.address ?? ""}`,
    searchText: `${location.locationName} ${location.locationCode ?? ""} ${location.address ?? ""}`,
    content: (
      <span>
        {location.locationName}
        {location.locationType ? ` — ${location.locationType}` : ""}
      </span>
    ),
  }));

  return (
    <form
      action={formAction}
      noValidate
      aria-busy={pending}
      aria-label="ثبت درخواست سفر"
      className={styles.form}
    >
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}

      <section className={styles.section} aria-labelledby={`${prefix}-request`}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.step}>۱</p>
            <h2 id={`${prefix}-request`}>اطلاعات درخواست</h2>
          </div>
          <p>شمارهٔ درخواست خودکار و وضعیت اولیه «جدید» است.</p>
        </div>

        <FormGrid>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-request-type`} required>
              نوع درخواست
            </FieldLabel>
            <select
              id={`${prefix}-request-type`}
              name="tripRequestTypeId"
              className={formControlClassName}
              defaultValue={value("tripRequestTypeId")}
              disabled={pending}
            >
              <option value="">انتخاب نوع درخواست</option>
              {requestTypes.map((type) => (
                <option
                  key={type.tripRequestTypeId}
                  value={type.tripRequestTypeId}
                >
                  {type.typeName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-purpose`}>هدف سفر</FieldLabel>
            <input
              id={`${prefix}-purpose`}
              name="purpose"
              className={formControlClassName}
              defaultValue={value("purpose")}
              disabled={pending}
            />
          </FormField>
        </FormGrid>

        <div className={styles.dateRows}>
          <div className={styles.dateRow}>
            <JalaliDatePicker
              name="requestDay"
              label="تاریخ ثبت درخواست (شمسی)"
              defaultValue={value("requestDay")}
              disabled={pending}
            />
            <TimeSelect
              id={`${prefix}-request-time`}
              name="requestTime"
              label="ساعت ثبت (تهران)"
              defaultValue={value("requestTime")}
              disabled={pending}
            />
          </div>
          <div className={styles.dateRow}>
            <JalaliDatePicker
              name="requestedTravelDay"
              label="تاریخ برنامه‌ریزی‌شده (شمسی)"
              defaultValue={value("requestedTravelDay")}
              disabled={pending}
            />
            <TimeSelect
              id={`${prefix}-travel-time`}
              name="requestedTravelTime"
              label="ساعت برنامه‌ریزی‌شده (تهران)"
              defaultValue={value("requestedTravelTime")}
              disabled={pending}
            />
          </div>
        </div>

        <FormField>
          <FieldLabel htmlFor={`${prefix}-request-description`}>
            توضیحات درخواست
          </FieldLabel>
          <textarea
            id={`${prefix}-request-description`}
            name="requestDescription"
            className={formControlClassName}
            rows={3}
            defaultValue={value("requestDescription")}
            disabled={pending}
          />
        </FormField>
      </section>

      <section
        className={styles.section}
        aria-labelledby={`${prefix}-passengers`}
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.step}>۲</p>
            <h2 id={`${prefix}-passengers`}>مسافران و مسیر هر نفر</h2>
          </div>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || passengerCount >= 50}
            onClick={() => setPassengerCount((count) => count + 1)}
          >
            افزودن مسافر
          </ActionButton>
        </div>

        <input
          type="hidden"
          name="passengerCount"
          value={passengerCount}
          readOnly
        />

        <div className={styles.passengerList}>
          {Array.from({ length: passengerCount }, (_, index) => (
            <article className={styles.passengerCard} key={index}>
              <div className={styles.passengerHeader}>
                <h3>مسافر {index + 1}</h3>
                {passengerCount > 1 && index === passengerCount - 1 && (
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      setPassengerCount((count) => Math.max(1, count - 1))
                    }
                  >
                    حذف
                  </ActionButton>
                )}
              </div>
              <FormGrid>
                <FormField>
                  <SearchableSelect
                    name={`passenger.${index}.personId`}
                    label="مسافر"
                    options={personOptions}
                    defaultValue={value(`passenger.${index}.personId`)}
                    placeholder="انتخاب مسافر"
                    searchPlaceholder="جستجوی نام، شماره پرسنلی یا موبایل…"
                    disabled={pending}
                    required
                  />
                </FormField>
                <FormField>
                  <SearchableSelect
                    name={`passenger.${index}.originLocationId`}
                    label="مبدأ"
                    options={locationOptions}
                    defaultValue={value(
                      `passenger.${index}.originLocationId`,
                    )}
                    placeholder="انتخاب مبدأ"
                    searchPlaceholder="جستجوی نام، کد یا نشانی مکان…"
                    disabled={pending}
                    required
                  />
                </FormField>
                <FormField>
                  <SearchableSelect
                    name={`passenger.${index}.destinationLocationId`}
                    label="مقصد"
                    options={locationOptions}
                    defaultValue={value(
                      `passenger.${index}.destinationLocationId`,
                    )}
                    placeholder="انتخاب مقصد"
                    searchPlaceholder="جستجوی نام، کد یا نشانی مکان…"
                    disabled={pending}
                    required
                  />
                </FormField>
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
                <FormField>
                  <FieldLabel htmlFor={`${prefix}-trip-status-${index}`}>
                    وضعیت سفر مسافر
                  </FieldLabel>
                  <input
                    id={`${prefix}-trip-status-${index}`}
                    name={`passenger.${index}.status`}
                    className={formControlClassName}
                    defaultValue={value(`passenger.${index}.status`)}
                    disabled={pending}
                  />
                </FormField>
              </FormGrid>
              <div className={styles.dateRow}>
                <JalaliDatePicker
                  name={`passenger.${index}.pickupDay`}
                  label="تاریخ درخواست‌شدهٔ سوارشدن (شمسی)"
                  defaultValue={value(`passenger.${index}.pickupDay`)}
                  disabled={pending}
                />
                <TimeSelect
                  id={`${prefix}-pickup-time-${index}`}
                  name={`passenger.${index}.pickupTime`}
                  label="ساعت سوارشدن (تهران)"
                  defaultValue={value(`passenger.${index}.pickupTime`)}
                  disabled={pending}
                />
              </div>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-trip-description-${index}`}>
                  توضیحات این مسافر
                </FieldLabel>
                <textarea
                  id={`${prefix}-trip-description-${index}`}
                  name={`passenger.${index}.description`}
                  className={formControlClassName}
                  rows={2}
                  defaultValue={value(`passenger.${index}.description`)}
                  disabled={pending}
                />
              </FormField>
            </article>
          ))}
        </div>
      </section>

      <FormActions separated>
        <ActionButton type="submit" disabled={pending} pending={pending}>
          {pending ? "در حال ثبت…" : "ثبت درخواست سفر"}
        </ActionButton>
      </FormActions>
    </form>
  );
}
