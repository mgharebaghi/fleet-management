"use client";

import { useEffect, useId, useState, useTransition } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { Dialog } from "@/components/ui/dialog/dialog";
import {
  FieldLabel,
  FormField,
  formControlClassName,
} from "@/components/ui/form-field/form-field";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import type { TripLocationReference } from "../../application/trip-records";
import {
  createLocationAction,
  type CreateLocationActionState,
  type LocationFieldName,
} from "./location.actions";
import styles from "./location-picker.module.css";

export const LOCATION_CREATED_EVENT = "fleet-management:trip-location-created";

const locationMessages: Record<
  NonNullable<CreateLocationActionState["error"]>,
  string
> = {
  LOCATION_NAME_REQUIRED: "نام مکان را وارد کنید.",
  LOCATION_NAME_TOO_LONG: "نام مکان حداکثر ۲۰۰ نویسه است.",
  LOCATION_CODE_TOO_LONG: "کد مکان حداکثر ۵۰ نویسه است.",
  LOCATION_TYPE_TOO_LONG: "نوع مکان حداکثر ۱۰۰ نویسه است.",
  INVALID_LATITUDE:
    "عرض جغرافیایی باید بین ۹۰- و ۹۰، با حداکثر ۶ رقم اعشار باشد.",
  INVALID_LONGITUDE:
    "طول جغرافیایی باید بین ۱۸۰- و ۱۸۰، با حداکثر ۶ رقم اعشار باشد.",
  LOCATION_CODE_DUPLICATE: "مکانی با این کد از قبل ثبت شده است.",
  LOCATION_NAME_ADDRESS_DUPLICATE:
    "مکانی با همین نام و نشانی از قبل ثبت شده است.",
  LOCATION_INACTIVE_DUPLICATE:
    "این مکان از قبل وجود دارد اما غیرفعال است؛ با مدیر سامانه هماهنگ کنید.",
  INVALID_FORM: "اطلاعات مکان قابل پردازش نیست.",
  UNEXPECTED: "ثبت مکان انجام نشد. دوباره تلاش کنید.",
};

type LocationValues = {
  locationName: string;
  locationCode: string;
  locationType: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
};

const emptyValues: LocationValues = {
  locationName: "",
  locationCode: "",
  locationType: "",
  address: "",
  latitude: "",
  longitude: "",
  description: "",
};

function locationOptions(locations: TripLocationReference[]) {
  return locations.map((location) => ({
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
}

function fieldDescriptionId(prefix: string, field: LocationFieldName) {
  return `${prefix}-${field}-error`;
}

export function LocationPicker({
  name,
  label,
  locations,
  defaultValue = "",
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
}: {
  name: string;
  label: string;
  locations: TripLocationReference[];
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const pickerId = useId();
  const dialogTitleId = `${pickerId}-create-title`;
  const [availableLocations, setAvailableLocations] = useState(locations);
  const [selection, setSelection] = useState({
    source: defaultValue,
    value: defaultValue,
    version: 0,
  });
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<LocationValues>(emptyValues);
  const [actionState, setActionState] =
    useState<CreateLocationActionState>({});
  const [pending, startTransition] = useTransition();

  let synchronizedSelection = selection;
  if (selection.source !== defaultValue) {
    synchronizedSelection = {
      source: defaultValue,
      value: defaultValue,
      version: selection.version + 1,
    };
    setSelection(synchronizedSelection);
  }

  useEffect(() => {
    function addLocation(event: Event) {
      const detail = (
        event as CustomEvent<{
          location: TripLocationReference;
          sourcePickerId: string;
        }>
      ).detail;
      setAvailableLocations((current) =>
        current.some(
          (location) => location.locationId === detail.location.locationId,
        )
          ? current
          : [...current, detail.location].sort((left, right) =>
              left.locationName.localeCompare(right.locationName, "fa"),
            ),
      );
      if (detail.sourcePickerId === pickerId) {
        setSelection((current) => ({
          source: defaultValue,
          value: String(detail.location.locationId),
          version: current.version + 1,
        }));
      }
    }
    window.addEventListener(LOCATION_CREATED_EVENT, addLocation);
    return () => window.removeEventListener(LOCATION_CREATED_EVENT, addLocation);
  }, [defaultValue, pickerId]);

  function change(field: keyof LocationValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function submitLocation() {
    const data = new FormData();
    for (const [field, value] of Object.entries(values)) {
      data.set(field, value);
    }
    startTransition(async () => {
      const result = await createLocationAction({}, data);
      setActionState(result);
      if (!result.location) {
        if (result.values) {
          setValues(result.values as LocationValues);
        }
        return;
      }
      window.dispatchEvent(
        new CustomEvent(LOCATION_CREATED_EVENT, {
          detail: { location: result.location, sourcePickerId: pickerId },
        }),
      );
      setValues(emptyValues);
      setOpen(false);
    });
  }

  const fieldError = (field: LocationFieldName) =>
    actionState.error && actionState.field === field
      ? fieldDescriptionId(pickerId, field)
      : undefined;

  return (
    <div className={styles.picker}>
      <SearchableSelect
        key={`${synchronizedSelection.value}-${synchronizedSelection.version}`}
        name={name}
        label={label}
        options={locationOptions(availableLocations)}
        defaultValue={synchronizedSelection.value}
        placeholder={`انتخاب ${label}`}
        searchPlaceholder="جستجوی نام، کد یا نشانی…"
        emptyMessage="مکانی پیدا نشد"
        disabled={disabled}
        required={required}
        invalid={invalid}
        describedBy={describedBy}
      />
      <button
        type="button"
        className={styles.createButton}
        disabled={disabled}
        onClick={() => {
          setActionState({});
          setOpen(true);
        }}
      >
        + ثبت مکان جدید
      </button>
      {actionState.location && (
        <InlineNotice tone="info" role="status">
          «{actionState.location.locationName}» ثبت و برای {label} انتخاب شد.
        </InlineNotice>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={dialogTitleId}
        title="ثبت مکان جدید"
        description="نام مکان الزامی است؛ سایر اطلاعات را در صورت دسترسی وارد کنید."
        size="wide"
      >
        <div className={styles.form} aria-busy={pending}>
          {actionState.error && (
            <InlineNotice tone="danger" role="alert">
              {locationMessages[actionState.error]}
            </InlineNotice>
          )}
          <FormGrid>
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-location-name`} required>
                نام مکان
              </FieldLabel>
              <input
                id={`${pickerId}-location-name`}
                className={formControlClassName}
                value={values.locationName}
                disabled={pending}
                aria-invalid={Boolean(fieldError("locationName"))}
                aria-describedby={fieldError("locationName")}
                onChange={(event) => change("locationName", event.target.value)}
              />
              {fieldError("locationName") && (
                <p
                  id={fieldDescriptionId(pickerId, "locationName")}
                  className={styles.fieldError}
                >
                  {locationMessages[actionState.error!]}
                </p>
              )}
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-location-code`}>
                کد مکان (اختیاری)
              </FieldLabel>
              <input
                id={`${pickerId}-location-code`}
                className={formControlClassName}
                dir="ltr"
                value={values.locationCode}
                disabled={pending}
                aria-invalid={Boolean(fieldError("locationCode"))}
                aria-describedby={fieldError("locationCode")}
                onChange={(event) => change("locationCode", event.target.value)}
              />
              {fieldError("locationCode") && (
                <p
                  id={fieldDescriptionId(pickerId, "locationCode")}
                  className={styles.fieldError}
                >
                  {locationMessages[actionState.error!]}
                </p>
              )}
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-location-type`}>
                نوع مکان (اختیاری)
              </FieldLabel>
              <input
                id={`${pickerId}-location-type`}
                className={formControlClassName}
                value={values.locationType}
                disabled={pending}
                aria-invalid={Boolean(fieldError("locationType"))}
                aria-describedby={fieldError("locationType")}
                onChange={(event) => change("locationType", event.target.value)}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-latitude`}>
                عرض جغرافیایی (اختیاری)
              </FieldLabel>
              <input
                id={`${pickerId}-latitude`}
                className={formControlClassName}
                dir="ltr"
                inputMode="decimal"
                value={values.latitude}
                disabled={pending}
                aria-invalid={Boolean(fieldError("latitude"))}
                aria-describedby={fieldError("latitude")}
                onChange={(event) => change("latitude", event.target.value)}
              />
            </FormField>
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-longitude`}>
                طول جغرافیایی (اختیاری)
              </FieldLabel>
              <input
                id={`${pickerId}-longitude`}
                className={formControlClassName}
                dir="ltr"
                inputMode="decimal"
                value={values.longitude}
                disabled={pending}
                aria-invalid={Boolean(fieldError("longitude"))}
                aria-describedby={fieldError("longitude")}
                onChange={(event) => change("longitude", event.target.value)}
              />
            </FormField>
          </FormGrid>
          <FormField>
            <FieldLabel htmlFor={`${pickerId}-address`}>
              نشانی (اختیاری)
            </FieldLabel>
            <textarea
              id={`${pickerId}-address`}
              className={formControlClassName}
              rows={2}
              value={values.address}
              disabled={pending}
              onChange={(event) => change("address", event.target.value)}
            />
          </FormField>
          <FormField>
            <FieldLabel htmlFor={`${pickerId}-description`}>
              توضیحات (اختیاری)
            </FieldLabel>
            <textarea
              id={`${pickerId}-description`}
              className={formControlClassName}
              rows={2}
              value={values.description}
              disabled={pending}
              onChange={(event) => change("description", event.target.value)}
            />
          </FormField>
          {actionState.similarLocations &&
            actionState.similarLocations.length > 0 && (
              <div className={styles.similar}>
                <strong>مکان‌های مشابه:</strong>
                <ul>
                  {actionState.similarLocations.map((location) => (
                    <li key={location.locationId}>
                      {location.locationName}
                      {location.address ? ` — ${location.address}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          <div className={styles.actions}>
            <ActionButton
              type="button"
              pending={pending}
              disabled={pending}
              onClick={submitLocation}
            >
              {pending ? "در حال ثبت…" : "ثبت و انتخاب مکان"}
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              انصراف
            </ActionButton>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
