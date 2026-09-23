"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import type { TripLocationReference } from "../../application/trip-records";
import { LocationCreateDialog } from "./location-create-dialog";
import { LocationMapSelectDialog } from "./location-map-select-dialog";
import { savedLocationChoices } from "./location-map-selection";
import styles from "./location-picker.module.css";

export const LOCATION_CREATED_EVENT = "fleet-management:trip-location-created";

function locationOptions(locations: TripLocationReference[]) {
  return savedLocationChoices(locations).map((choice) => ({
    value: choice.locationId,
    label: choice.searchText,
    searchText: choice.searchText,
    content: (
      <span>
        {choice.locationName}
        {choice.locationType ? ` — ${choice.locationType}` : ""}
      </span>
    ),
  }));
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
  onValueChange,
  layout = "field",
  actions,
}: {
  name: string;
  label: string;
  locations: TripLocationReference[];
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onValueChange?: (locationId: string) => void;
  /** Route stops keep the location full width and place actions on the next row. */
  layout?: "field" | "stop";
  actions?: ReactNode;
}) {
  const pickerId = useId();
  const [availableLocations, setAvailableLocations] = useState(locations);
  const [selection, setSelection] = useState({
    source: defaultValue,
    value: defaultValue,
    version: 0,
  });
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [createdNotice, setCreatedNotice] =
    useState<TripLocationReference | null>(null);

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
        const locationId = String(detail.location.locationId);
        setSelection((current) => ({
          source: defaultValue,
          value: locationId,
          version: current.version + 1,
        }));
        onValueChange?.(locationId);
      }
    }
    window.addEventListener(LOCATION_CREATED_EVENT, addLocation);
    return () => window.removeEventListener(LOCATION_CREATED_EVENT, addLocation);
  }, [defaultValue, onValueChange, pickerId]);

  const locationSelect = (
    <SearchableSelect
      key={`${synchronizedSelection.value}-${synchronizedSelection.version}`}
      name={name}
      label={label}
      options={locationOptions(availableLocations)}
      defaultValue={synchronizedSelection.value}
      placeholder={`انتخاب ${label}`}
      searchPlaceholder="جستجوی نام، کد، نوع یا نشانی…"
      emptyMessage="مکانی پیدا نشد"
      disabled={disabled}
      required={required}
      invalid={invalid}
      describedBy={describedBy}
      onValueChange={(value) => {
        setSelection((current) =>
          current.value === value
            ? current
            : { source: defaultValue, value, version: current.version },
        );
        onValueChange?.(value);
      }}
    />
  );
  const mapButton = (
    <button
      type="button"
      className={layout === "stop" ? styles.stopAction : styles.mapButton}
      disabled={disabled}
      onClick={() => setMapOpen(true)}
    >
      انتخاب روی نقشه
    </button>
  );
  const createButton = (
    <button
      type="button"
      className={layout === "stop" ? styles.stopAction : styles.createButton}
      disabled={disabled}
      onClick={() => {
        setCreatedNotice(null);
        setOpen(true);
      }}
    >
      + ثبت مکان جدید
    </button>
  );

  return (
    <div className={styles.picker}>
      {layout === "stop" ? (
        <>
          {locationSelect}
          <div className={styles.stopActions}>
            {mapButton}
            {actions}
            {createButton}
          </div>
        </>
      ) : (
        <>
          <div className={styles.fieldRow}>
            {locationSelect}
            {mapButton}
          </div>
          {createButton}
        </>
      )}
      {createdNotice && (
        <InlineNotice tone="info" role="status">
          «{createdNotice.locationName}» ثبت و برای {label} انتخاب شد.
        </InlineNotice>
      )}
      {mapOpen && (
        <LocationMapSelectDialog
          idPrefix={pickerId}
          locations={availableLocations}
          selectedLocationId={synchronizedSelection.value}
          onClose={() => setMapOpen(false)}
          onConfirm={(locationId) => {
            setSelection((current) => ({
              source: defaultValue,
              value: locationId,
              version: current.version + 1,
            }));
            onValueChange?.(locationId);
            setMapOpen(false);
          }}
        />
      )}
      <LocationCreateDialog
        open={open}
        pickerId={pickerId}
        onClose={() => setOpen(false)}
        onCreated={(location) => {
          window.dispatchEvent(
            new CustomEvent(LOCATION_CREATED_EVENT, {
              detail: { location, sourcePickerId: pickerId },
            }),
          );
          setCreatedNotice(location);
          setOpen(false);
        }}
      />
    </div>
  );
}
