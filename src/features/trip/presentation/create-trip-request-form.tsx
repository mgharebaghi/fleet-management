"use client";

import { useActionState, useEffect, useId, useInsertionEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { JalaliDatePicker } from "@/components/ui/date-picker/jalali-date-picker";
import {
  FieldErrors,
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
import { LocationPicker } from "./location/location-picker";
import styles from "./trip-forms.module.css";

type CreateTripRequestFormProps = {
  requestTypes: TripRequestTypeReference[];
  people: TripPersonReference[];
  locations: TripLocationReference[];
};

function typeExplanation(typeCode: string) {
  switch (typeCode) {
    case "COMMON_ORIGIN":
      return "یک مبدأ مشترک برای همهٔ مسافران؛ مقصد هر نفر جداگانه ثبت می‌شود.";
    case "COMMON_DESTINATION":
      return "یک مقصد مشترک برای همهٔ مسافران؛ مبدأ هر نفر جداگانه ثبت می‌شود.";
    case "COMMON_ORIGIN_DESTINATION":
      return "مبدأ و مقصد برای همهٔ مسافران یکسان است و در پروندهٔ هر مسافر تکرار می‌شود.";
    default:
      return "مبدأ و مقصد را برای هر مسافر مطابق همین درخواست ثبت کنید.";
  }
}

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
  const formRef = useRef<HTMLFormElement>(null);
  const [passengerCount, setPassengerCount] = useState(
    Math.max(1, Number(state.values?.passengerCount ?? 1) || 1),
  );
  const [selectedTypeId, setSelectedTypeId] = useState(
    state.values?.tripRequestTypeId ?? "",
  );
  const [typeRestoreNonce, setTypeRestoreNonce] = useState(0);
  const selectedTypeIdRef = useRef(selectedTypeId);
  useInsertionEffect(() => {
    selectedTypeIdRef.current =
      selectedTypeId || state.values?.tripRequestTypeId || "";
  });

  const value = (name: string) => state.values?.[name] ?? "";
  const selectedType = requestTypes.find(
    (type) => String(type.tripRequestTypeId) === selectedTypeId,
  );
  const shareOrigin =
    selectedType?.typeCode === "COMMON_ORIGIN" ||
    selectedType?.typeCode === "COMMON_ORIGIN_DESTINATION";
  const shareDestination =
    selectedType?.typeCode === "COMMON_DESTINATION" ||
    selectedType?.typeCode === "COMMON_ORIGIN_DESTINATION";
  const fieldInvalid = (name: string) => state.field === name;
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
    if (!state.field || !formRef.current) return;
    const invalid = formRef.current.querySelector<HTMLElement>(
      `[name="${state.field}"], #${prefix}-${state.field}`,
    );
    invalid?.focus();
  }, [prefix, state.field]);

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

  return (
    <form
      ref={formRef}
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
              key={typeRestoreNonce}
              id={`${prefix}-request-type`}
              name="tripRequestTypeId"
              className={formControlClassName}
              defaultValue={selectedTypeId}
              disabled={pending}
              required
              aria-invalid={fieldInvalid("tripRequestTypeId")}
              aria-describedby={fieldErrorId("tripRequestTypeId")}
              onChange={(event) => setSelectedTypeId(event.target.value)}
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
            {fieldInvalid("tripRequestTypeId") && state.error && (
              <FieldErrors
                id={`${prefix}-tripRequestTypeId-error`}
                messages={[tripMessages[state.error]]}
              />
            )}
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${prefix}-purpose`}>
              هدف سفر (اختیاری)
            </FieldLabel>
            <input
              id={`${prefix}-purpose`}
              name="purpose"
              className={formControlClassName}
              defaultValue={value("purpose")}
              disabled={pending}
              aria-invalid={fieldInvalid("purpose")}
              aria-describedby={fieldErrorId("purpose")}
            />
            {fieldInvalid("purpose") && state.error && (
              <FieldErrors
                id={`${prefix}-purpose-error`}
                messages={[tripMessages[state.error]]}
              />
            )}
          </FormField>
        </FormGrid>
        {selectedType && (
          <p className={styles.hint}>{typeExplanation(selectedType.typeCode)}</p>
        )}

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

        {(shareOrigin || shareDestination) && (
          <FormGrid>
            {shareOrigin && (
              <FormField>
                <LocationPicker
                  name="commonOriginLocationId"
                  label="مبدأ مشترک"
                  locations={locations}
                  defaultValue={value("commonOriginLocationId")}
                  disabled={pending}
                  required
                  invalid={fieldInvalid("commonOriginLocationId")}
                  describedBy={fieldErrorId("commonOriginLocationId")}
                />
              </FormField>
            )}
            {shareDestination && (
              <FormField>
                <LocationPicker
                  name="commonDestinationLocationId"
                  label="مقصد مشترک"
                  locations={locations}
                  defaultValue={value("commonDestinationLocationId")}
                  disabled={pending}
                  required
                  invalid={fieldInvalid("commonDestinationLocationId")}
                  describedBy={fieldErrorId("commonDestinationLocationId")}
                />
              </FormField>
            )}
          </FormGrid>
        )}

        <FormField>
          <FieldLabel htmlFor={`${prefix}-request-description`}>
            توضیحات درخواست (اختیاری)
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
            <h2 id={`${prefix}-passengers`}>مسافران</h2>
          </div>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setPassengerCount((count) => count + 1)}
          >
            افزودن مسافر
          </ActionButton>
        </div>
        <p className={styles.hint}>
          اگر زمان سوارشدن هر مسافر خالی بماند، همان زمان برنامه‌ریزی‌شدهٔ
          درخواست استفاده می‌شود.
        </p>

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
                    invalid={fieldInvalid(`passenger.${index}.personId`)}
                  />
                </FormField>
                {!shareOrigin && (
                  <FormField>
                    <LocationPicker
                      name={`passenger.${index}.originLocationId`}
                      label="مبدأ"
                      locations={locations}
                      defaultValue={value(
                        `passenger.${index}.originLocationId`,
                      )}
                      disabled={pending}
                      required
                    />
                  </FormField>
                )}
                {!shareDestination && (
                  <FormField>
                    <LocationPicker
                      name={`passenger.${index}.destinationLocationId`}
                      label="مقصد"
                      locations={locations}
                      defaultValue={value(
                        `passenger.${index}.destinationLocationId`,
                      )}
                      disabled={pending}
                      required
                    />
                  </FormField>
                )}
                {passengerCount > 1 && (
                  <>
                    <FormField>
                      <FieldLabel htmlFor={`${prefix}-pickup-order-${index}`}>
                        ترتیب سوارشدن (اختیاری)
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
                        ترتیب پیاده‌شدن (اختیاری)
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
                  </>
                )}
              </FormGrid>
              <div className={styles.dateRow}>
                <JalaliDatePicker
                  name={`passenger.${index}.pickupDay`}
                  label="تاریخ درخواست‌شدهٔ سوارشدن (اختیاری)"
                  defaultValue={value(`passenger.${index}.pickupDay`)}
                  disabled={pending}
                />
                <TimeSelect
                  id={`${prefix}-pickup-time-${index}`}
                  name={`passenger.${index}.pickupTime`}
                  label="ساعت سوارشدن (تهران، اختیاری)"
                  defaultValue={value(`passenger.${index}.pickupTime`)}
                  disabled={pending}
                />
              </div>
              <FormField>
                <FieldLabel htmlFor={`${prefix}-trip-description-${index}`}>
                  توضیحات این مسافر (اختیاری)
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
