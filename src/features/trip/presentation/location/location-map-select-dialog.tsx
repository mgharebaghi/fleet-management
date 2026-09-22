"use client";

import { useEffect, useRef, useState } from "react";

import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import {
  FieldLabel,
  formControlClassName,
} from "../../../../components/ui/form-field/form-field";
import { filterSearchableOptions } from "../../../../components/ui/searchable-select/searchable-select-options";
import {
  IRAN_MAP_OVERVIEW,
  IRAN_MAP_OVERVIEW_ZOOM,
  MAP_SELECTED_ZOOM,
} from "../../../../maps/map-coordinate";
import { MapCanvas, type MapFocus } from "../../../../maps/presentation/map-canvas";
import { loadMapConfiguration } from "../../../../maps/presentation/map-place.actions";
import type { TripLocationReference } from "../../application/trip-records";
import {
  focusForSavedLocation,
  savedLocationChoices,
  savedLocationMarkers,
} from "./location-map-selection";
import styles from "./location-map-select-dialog.module.css";

const MAP_LOADING_MESSAGE = "در حال بارگذاری نقشه…";
const MAP_UNAVAILABLE_MESSAGE =
  "نقشه موقتاً در دسترس نیست؛ می‌توانید مکان را از فهرست انتخاب کنید.";

export function LocationMapSelectDialog({
  idPrefix,
  locations,
  selectedLocationId,
  onClose,
  onConfirm,
  mapKey: mapKeyProp,
}: {
  idPrefix: string;
  locations: readonly TripLocationReference[];
  selectedLocationId: string;
  onClose: () => void;
  onConfirm: (locationId: string) => void;
  /** Tests pass null to force the unavailable map. Omit to load the runtime key. */
  mapKey?: string | null;
}) {
  const choices = savedLocationChoices(locations);
  const [selectedId, setSelectedId] = useState(selectedLocationId);
  const [query, setQuery] = useState("");
  const focusKey = useRef(1);
  const openingFocus = focusForSavedLocation(choices, selectedLocationId);
  const [focus, setFocus] = useState<MapFocus | null>(
    openingFocus
      ? { coordinate: openingFocus, zoom: MAP_SELECTED_ZOOM, key: 1 }
      : null,
  );
  const [mapPhase, setMapPhase] = useState<"loading" | "ready" | "missing">(
    () => (mapKeyProp === undefined ? "loading" : mapKeyProp ? "ready" : "missing"),
  );
  const [mapKey, setMapKey] = useState<string | null>(mapKeyProp ?? null);

  useEffect(() => {
    if (mapKeyProp !== undefined) return;
    let cancelled = false;
    void loadMapConfiguration()
      .then((config) => {
        if (cancelled) return;
        setMapKey(config.mapKey);
        setMapPhase(config.mapKey ? "ready" : "missing");
      })
      .catch(() => {
        if (!cancelled) setMapPhase("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [mapKeyProp]);

  function choose(locationId: string) {
    setSelectedId(locationId);
    const coordinate = focusForSavedLocation(choices, locationId);
    if (!coordinate) return;
    focusKey.current += 1;
    setFocus({
      coordinate,
      zoom: MAP_SELECTED_ZOOM,
      key: focusKey.current,
    });
  }

  const visible = filterSearchableOptions(
    choices.map((choice) => ({
      value: choice.locationId,
      label: choice.searchText,
      searchText: choice.searchText,
      content: choice.locationName,
    })),
    query,
  );
  const visibleChoices = visible.flatMap((option) => {
    const choice = choices.find((item) => item.locationId === option.value);
    return choice ? [choice] : [];
  });
  const selected = choices.find((choice) => choice.locationId === selectedId) ?? null;
  const mapMode =
    mapPhase === "ready" && mapKey ? "ready" : mapPhase === "missing" ? "unavailable" : "loading";

  return (
    <Dialog
      open
      onClose={onClose}
      titleId={`${idPrefix}-saved-location-map-title`}
      title="انتخاب مکان"
      description="مکان‌های ذخیره‌شده را از فهرست یا روی نقشه انتخاب کنید."
      size="map"
    >
      <div className={styles.layout}>
        <section className={styles.mapColumn} aria-label="نقشه مکان‌های ذخیره‌شده">
          <MapCanvas
            mode={mapMode}
            mapKey={mapKey}
            initialCenter={IRAN_MAP_OVERVIEW}
            initialZoom={IRAN_MAP_OVERVIEW_ZOOM}
            markers={savedLocationMarkers(choices, selectedId)}
            focus={focus}
            onMarkerSelect={choose}
            loadingMessage={MAP_LOADING_MESSAGE}
            unavailableMessage={MAP_UNAVAILABLE_MESSAGE}
          />
        </section>
        <section className={styles.listColumn}>
          <div className={styles.search}>
            <FieldLabel htmlFor={`${idPrefix}-saved-location-search`}>
              جستجو در مکان‌های ثبت‌شده
            </FieldLabel>
            <input
              id={`${idPrefix}-saved-location-search`}
              className={formControlClassName}
              value={query}
              placeholder="نام، کد، نوع یا نشانی"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {visibleChoices.length === 0 ? (
            <p className={styles.empty}>مکانی با این مشخصات پیدا نشد.</p>
          ) : (
            <ul className={styles.results}>
              {visibleChoices.map((choice) => {
                const detail = [choice.locationType, choice.address]
                  .filter((part) => part && part.trim())
                  .join(" — ");
                const meta = [detail, choice.coordinate ? "" : "بدون مختصات"]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={choice.locationId}>
                    <button
                      type="button"
                      className={
                        choice.locationId === selectedId
                          ? `${styles.resultButton} ${styles.resultSelected}`
                          : styles.resultButton
                      }
                      aria-pressed={choice.locationId === selectedId}
                      onClick={() => choose(choice.locationId)}
                    >
                      <span>{choice.locationName}</span>
                      {meta && <span className={styles.resultMeta}>{meta}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={styles.summary}>
            {selected
              ? `مکان انتخاب‌شده: ${selected.locationName}`
              : "مکانی انتخاب نشده است."}
          </p>
          {selected && !selected.coordinate && (
            <p className={styles.hint}>مختصات برای این مکان ثبت نشده است.</p>
          )}
        </section>
      </div>
      <div className={styles.actions}>
        <ActionButton
          type="button"
          size="sm"
          disabled={!selected}
          onClick={() => {
            if (selected) onConfirm(selected.locationId);
          }}
        >
          انتخاب این مکان
        </ActionButton>
        <ActionButton type="button" size="sm" variant="secondary" onClick={onClose}>
          انصراف
        </ActionButton>
      </div>
    </Dialog>
  );
}
