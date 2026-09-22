"use client";

import { useEffect, useInsertionEffect, useRef, useState, useTransition } from "react";

import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import {
  FieldLabel,
  FormField,
  formControlClassName,
} from "../../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { SearchableCombobox } from "../../../../components/ui/searchable-combobox/searchable-combobox";
import {
  IRAN_MAP_OVERVIEW,
  IRAN_MAP_OVERVIEW_ZOOM,
  MAP_SELECTED_ZOOM,
  parseMapCoordinate,
  type MapCoordinate,
} from "../../../../maps/map-coordinate";
import {
  isCurrentLookup,
  lookupCacheKey,
  MAP_SEARCH_DEBOUNCE_MS,
  normalizeSearchTerm,
  type MapSearchResult,
} from "../../../../maps/map-place";
import { MapCanvas, type MapFocus } from "../../../../maps/presentation/map-canvas";
import {
  loadMapConfiguration,
  reverseMapPoint,
  searchMapPlaces,
} from "../../../../maps/presentation/map-place.actions";
import type { TripLocationReference } from "../../application/trip-records";
import {
  createLocationAction,
  type CreateLocationActionState,
  type LocationFieldName,
} from "./location.actions";
import {
  acceptAddressSuggestion,
  LOCATION_TYPE_SUGGESTIONS,
  proposeLocationAddress,
  proposeLocationName,
} from "./location-assist";
import styles from "./location-create-dialog.module.css";

const MAP_LOADING_MESSAGE = "در حال بارگذاری نقشه…";
const MAP_UNAVAILABLE_MESSAGE =
  "سرویس نقشه موقتاً در دسترس نیست؛ می‌توانید اطلاعات مکان را دستی ثبت کنید.";
const SEARCH_UNAVAILABLE_MESSAGE = "جستجوی نقشه فعلاً در دسترس نیست.";
const REVERSE_UNAVAILABLE_MESSAGE =
  "خواندن نشانی از روی نقشه ممکن نیست؛ نشانی را دستی وارد کنید.";

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

type AssistState = {
  values: LocationValues;
  nameEdited: boolean;
  addressEdited: boolean;
  addressSuggestion: string | null;
};

type SearchUi =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; results: MapSearchResult[] }
  | { status: "unavailable" };

/** A newly opened session must not keep the previous create attempt's error. */
export function actionStateForDialogSession(
  opening: boolean,
  actionState: CreateLocationActionState,
): CreateLocationActionState {
  return opening ? {} : actionState;
}

const emptyAssist: AssistState = {
  values: {
    locationName: "",
    locationCode: "",
    locationType: "",
    address: "",
    latitude: "",
    longitude: "",
    description: "",
  },
  nameEdited: false,
  addressEdited: false,
  addressSuggestion: null,
};

function fieldDescriptionId(prefix: string, field: LocationFieldName) {
  return `${prefix}-${field}-error`;
}

export function LocationCreateDialog({
  open,
  pickerId,
  mapKey: mapKeyProp,
  onClose,
  onCreated,
}: {
  open: boolean;
  pickerId: string;
  /** Omit to load the public map key from the server. Null shows the manual fallback. */
  mapKey?: string | null;
  onClose: () => void;
  onCreated: (location: TripLocationReference) => void;
}) {
  const [assist, setAssist] = useState<AssistState>(emptyAssist);
  const [marker, setMarker] = useState<MapCoordinate | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [query, setQuery] = useState("");
  const [searchUi, setSearchUi] = useState<SearchUi>({ status: "idle" });
  const [reverseUnavailable, setReverseUnavailable] = useState(false);
  const [mapPhase, setMapPhase] = useState<"loading" | "missing" | "ready">(
    () => (mapKeyProp === undefined ? "loading" : mapKeyProp ? "ready" : "missing"),
  );
  const [mapKey, setMapKey] = useState<string | null>(mapKeyProp ?? null);
  const [actionState, setActionState] = useState<CreateLocationActionState>({});
  const [pending, startTransition] = useTransition();
  const viewCenterRef = useRef<MapCoordinate>(IRAN_MAP_OVERVIEW);
  const searchCache = useRef(new Map<string, SearchUi>());
  const searchSerial = useRef(0);
  const reverseSerial = useRef(0);
  const focusKey = useRef(0);
  const openRef = useRef(open);
  const [sessionOpen, setSessionOpen] = useState(open);
  if (open !== sessionOpen) {
    setSessionOpen(open);
    if (open) {
      setActionState((current) => actionStateForDialogSession(true, current));
      if (mapKeyProp === undefined) setMapPhase("loading");
    } else {
      setQuery("");
      setSearchUi({ status: "idle" });
      setReverseUnavailable(false);
    }
  }

  useInsertionEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (!open || mapKeyProp !== undefined) return;
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
  }, [open, mapKeyProp]);

  useEffect(() => {
    if (!open) {
      searchCache.current.clear();
      searchSerial.current += 1;
      reverseSerial.current += 1;
      return;
    }
    const term = normalizeSearchTerm(query);
    if (!term) return;
    const generation = ++searchSerial.current;
    const timer = window.setTimeout(() => {
      const center = viewCenterRef.current;
      const cacheKey = lookupCacheKey(term, center);
      const cached = searchCache.current.get(cacheKey);
      if (cached) {
        if (isCurrentLookup(generation, searchSerial.current)) setSearchUi(cached);
        return;
      }
      setSearchUi({ status: "loading" });
      void searchMapPlaces({
        term,
        latitude: center.latitude,
        longitude: center.longitude,
      })
        .then((result) => {
          if (!isCurrentLookup(generation, searchSerial.current)) return;
          const next: SearchUi =
            result.status === "ok"
              ? { status: "ok", results: result.results }
              : { status: "unavailable" };
          searchCache.current.set(cacheKey, next);
          setSearchUi(next);
        })
        .catch(() => {
          if (!isCurrentLookup(generation, searchSerial.current)) return;
          const next: SearchUi = { status: "unavailable" };
          searchCache.current.set(cacheKey, next);
          setSearchUi(next);
        });
    }, MAP_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      searchSerial.current += 1;
    };
  }, [open, query]);

  function moveMap(coordinate: MapCoordinate) {
    focusKey.current += 1;
    setMarker(coordinate);
    setFocus({
      coordinate,
      zoom: MAP_SELECTED_ZOOM,
      key: focusKey.current,
    });
  }

  function change(field: keyof LocationValues, value: string) {
    setAssist((current) => ({
      ...current,
      nameEdited: field === "locationName" ? true : current.nameEdited,
      addressEdited: field === "address" ? true : current.addressEdited,
      values: { ...current.values, [field]: value },
    }));
  }

  function selectMapPoint(coordinate: MapCoordinate) {
    if (pending) return;
    moveMap(coordinate);
    setReverseUnavailable(false);
    setAssist((current) => ({
      ...current,
      values: {
        ...current.values,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      },
    }));
    const generation = ++reverseSerial.current;
    void reverseMapPoint(coordinate)
      .then((result) => {
        if (!openRef.current || !isCurrentLookup(generation, reverseSerial.current)) {
          return;
        }
        if (result.status !== "ok") {
          setReverseUnavailable(true);
          return;
        }
        setAssist((current) => {
          const address = proposeLocationAddress(
            current.values.address,
            current.addressEdited,
            current.addressSuggestion,
            result.address,
          );
          return {
            ...current,
            addressEdited: address.edited,
            addressSuggestion: address.suggestion,
            values: { ...current.values, address: address.value },
          };
        });
      })
      .catch(() => {
        if (openRef.current && isCurrentLookup(generation, reverseSerial.current)) {
          setReverseUnavailable(true);
        }
      });
  }

  function selectSearchResult(result: MapSearchResult) {
    if (pending) return;
    moveMap(result.coordinate);
    setReverseUnavailable(false);
    setAssist((current) => {
      const name = proposeLocationName(
        current.values.locationName,
        current.nameEdited,
        result.title,
      );
      const address = proposeLocationAddress(
        current.values.address,
        current.addressEdited,
        current.addressSuggestion,
        result.address,
      );
      return {
        nameEdited: name.edited,
        addressEdited: address.edited,
        addressSuggestion: address.suggestion,
        values: {
          ...current.values,
          locationName: name.value,
          address: address.value,
          latitude: result.coordinate.latitude,
          longitude: result.coordinate.longitude,
        },
      };
    });
  }

  function commitManualCoordinates() {
    const coordinate = parseMapCoordinate(
      assist.values.latitude,
      assist.values.longitude,
    );
    if (!coordinate) return;
    moveMap(coordinate);
  }

  function submitLocation() {
    const data = new FormData();
    for (const [field, value] of Object.entries(assist.values)) {
      data.set(field, value);
    }
    startTransition(async () => {
      const result = await createLocationAction({}, data);
      setActionState(result);
      if (!result.location) {
        if (result.values) {
          setAssist((current) => ({
            ...current,
            values: result.values as LocationValues,
          }));
        }
        return;
      }
      setAssist(emptyAssist);
      setMarker(null);
      setFocus(null);
      setActionState({});
      onCreated(result.location);
    });
  }

  const fieldError = (field: LocationFieldName) =>
    actionState.error && actionState.field === field
      ? fieldDescriptionId(pickerId, field)
      : undefined;
  const mapMode = mapPhase === "ready" && mapKey ? "ready" : mapPhase === "missing" ? "unavailable" : "loading";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={`${pickerId}-create-title`}
      title="ثبت مکان جدید"
      description="نام مکان الزامی است. نقشه فقط به ورود اطلاعات کمک می‌کند و ثبت دستی همیشه ممکن است."
      size="map"
    >
      <div className={styles.form} aria-busy={pending}>
        {actionState.error && (
          <InlineNotice tone="danger" role="alert">
            {locationMessages[actionState.error]}
          </InlineNotice>
        )}
        <div className={styles.layout}>
          <section className={styles.mapColumn} aria-label="نقشه">
            <div className={styles.search}>
              <FieldLabel htmlFor={`${pickerId}-map-search`}>
                جستجو در نقشه
              </FieldLabel>
              <input
                id={`${pickerId}-map-search`}
                className={formControlClassName}
                value={query}
                disabled={pending}
                placeholder="نام خیابان، میدان یا مکان"
                autoComplete="off"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchUi({ status: "idle" });
                }}
              />
            </div>
            {searchUi.status === "loading" && (
              <p className={styles.status}>در حال جستجو…</p>
            )}
            {searchUi.status === "unavailable" && (
              <p className={styles.status} role="status">
                {SEARCH_UNAVAILABLE_MESSAGE}
              </p>
            )}
            {searchUi.status === "ok" && searchUi.results.length === 0 && (
              <p className={styles.status}>نتیجه‌ای برای این جستجو پیدا نشد.</p>
            )}
            {searchUi.status === "ok" && searchUi.results.length > 0 && (
              <ul className={styles.results}>
                {searchUi.results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className={styles.resultButton}
                      disabled={pending}
                      onClick={() => selectSearchResult(result)}
                    >
                      <span className={styles.resultTitle}>{result.title}</span>
                      <span className={styles.resultMeta}>
                        {result.address}
                        {result.region ? ` — ${result.region}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <MapCanvas
              mode={mapMode}
              mapKey={mapKey}
              initialCenter={IRAN_MAP_OVERVIEW}
              initialZoom={IRAN_MAP_OVERVIEW_ZOOM}
              markers={
                marker ? [{ id: "selected", coordinate: marker }] : []
              }
              focus={focus}
              loadingMessage={MAP_LOADING_MESSAGE}
              unavailableMessage={MAP_UNAVAILABLE_MESSAGE}
              onViewCenterChange={(coordinate) => {
                viewCenterRef.current = coordinate;
              }}
              onSelectPoint={selectMapPoint}
            />
            {reverseUnavailable && (
              <p className={styles.status} role="status">
                {REVERSE_UNAVAILABLE_MESSAGE}
              </p>
            )}
          </section>
          <section className={styles.formColumn}>
            <FormGrid>
              <FormField>
                <FieldLabel htmlFor={`${pickerId}-location-name`} required>
                  نام مکان
                </FieldLabel>
                <input
                  id={`${pickerId}-location-name`}
                  className={formControlClassName}
                  value={assist.values.locationName}
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
                  کد مکان
                </FieldLabel>
                <input
                  id={`${pickerId}-location-code`}
                  className={formControlClassName}
                  dir="ltr"
                  value={assist.values.locationCode}
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
            </FormGrid>
            <SearchableCombobox
              id={`${pickerId}-location-type`}
              // Stay mounted inside the parent trip form. The name must be
              // unique per picker or duplicate fields make that form unreadable.
              name={`${pickerId}-locationType`}
              label="نوع مکان"
              suggestions={LOCATION_TYPE_SUGGESTIONS}
              value={assist.values.locationType}
              onValueChange={(value) => change("locationType", value)}
              placeholder="انتخاب یا نوشتن نوع مکان"
              disabled={pending}
              invalid={Boolean(fieldError("locationType"))}
              describedBy={fieldError("locationType")}
            />
            {fieldError("locationType") && (
              <p
                id={fieldDescriptionId(pickerId, "locationType")}
                className={styles.fieldError}
              >
                {locationMessages[actionState.error!]}
              </p>
            )}
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-address`}>نشانی</FieldLabel>
              <textarea
                id={`${pickerId}-address`}
                className={formControlClassName}
                rows={2}
                value={assist.values.address}
                disabled={pending}
                onChange={(event) => change("address", event.target.value)}
              />
            </FormField>
            {assist.addressSuggestion && (
              <div className={styles.addressSuggestion}>
                <p>{assist.addressSuggestion}</p>
                <button
                  type="button"
                  className={styles.useAddress}
                  disabled={pending}
                  onClick={() =>
                    setAssist((current) => {
                      const accepted = acceptAddressSuggestion(
                        current.values.address,
                        current.addressEdited,
                        current.addressSuggestion,
                      );
                      return {
                        ...current,
                        addressEdited: accepted.edited,
                        addressSuggestion: accepted.suggestion,
                        values: { ...current.values, address: accepted.value },
                      };
                    })
                  }
                >
                  استفاده از این نشانی
                </button>
              </div>
            )}
            <FormGrid>
              <FormField>
                <FieldLabel htmlFor={`${pickerId}-latitude`}>
                  عرض جغرافیایی
                </FieldLabel>
                <input
                  id={`${pickerId}-latitude`}
                  className={formControlClassName}
                  dir="ltr"
                  inputMode="decimal"
                  autoComplete="off"
                  value={assist.values.latitude}
                  disabled={pending}
                  aria-invalid={Boolean(fieldError("latitude"))}
                  aria-describedby={fieldError("latitude")}
                  onChange={(event) => change("latitude", event.target.value)}
                  onBlur={commitManualCoordinates}
                />
                {fieldError("latitude") && (
                  <p
                    id={fieldDescriptionId(pickerId, "latitude")}
                    className={styles.fieldError}
                  >
                    {locationMessages[actionState.error!]}
                  </p>
                )}
              </FormField>
              <FormField>
                <FieldLabel htmlFor={`${pickerId}-longitude`}>
                  طول جغرافیایی
                </FieldLabel>
                <input
                  id={`${pickerId}-longitude`}
                  className={formControlClassName}
                  dir="ltr"
                  inputMode="decimal"
                  autoComplete="off"
                  value={assist.values.longitude}
                  disabled={pending}
                  aria-invalid={Boolean(fieldError("longitude"))}
                  aria-describedby={fieldError("longitude")}
                  onChange={(event) => change("longitude", event.target.value)}
                  onBlur={commitManualCoordinates}
                />
                {fieldError("longitude") && (
                  <p
                    id={fieldDescriptionId(pickerId, "longitude")}
                    className={styles.fieldError}
                  >
                    {locationMessages[actionState.error!]}
                  </p>
                )}
              </FormField>
            </FormGrid>
            <FormField>
              <FieldLabel htmlFor={`${pickerId}-description`}>
                توضیحات
              </FieldLabel>
              <textarea
                id={`${pickerId}-description`}
                className={formControlClassName}
                rows={2}
                value={assist.values.description}
                disabled={pending}
                onChange={(event) => change("description", event.target.value)}
              />
            </FormField>
          </section>
        </div>
        {actionState.similarLocations && actionState.similarLocations.length > 0 && (
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
            size="sm"
            pending={pending}
            disabled={pending}
            onClick={submitLocation}
          >
            {pending ? "در حال ثبت…" : "ثبت و انتخاب مکان"}
          </ActionButton>
          <ActionButton
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            انصراف
          </ActionButton>
        </div>
      </div>
    </Dialog>
  );
}
