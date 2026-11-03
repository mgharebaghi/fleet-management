"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "../../../components/ui/action-button/action-button";
import { Dialog } from "../../../components/ui/dialog/dialog";
import { FieldLabel, FormActions, FormField, FieldHint, formControlClassName } from "../../../components/ui/form-field/form-field";
import { FormGrid } from "../../../components/ui/form-grid/form-grid";
import { InlineNotice } from "../../../components/ui/inline-notice/inline-notice";
import { IRAN_MAP_OVERVIEW, IRAN_MAP_OVERVIEW_ZOOM, MAP_SELECTED_ZOOM, type MapCoordinate } from "../../map-coordinate";
import { MAP_SEARCH_DEBOUNCE_MS, normalizeSearchTerm, type MapSearchResult } from "../../map-place";
import { MapCanvas, type MapFocus } from "../map-canvas";
import { loadMapConfiguration, reverseMapPoint, searchMapPlaces } from "../map-place.actions";
import { createAddressLookupSession } from "./address-lookup-session";

const unavailable = "نقشه در دسترس نیست؛ نشانی را در فرم دستی وارد کنید.";

export function AddressMapDialog({ onClose, onConfirm, mapKey: providedKey }: {
  onClose: () => void;
  onConfirm: (address: string) => void;
  /** Null forces the manual fallback in offline tests. */
  mapKey?: string | null;
}) {
  const [configuration, setConfiguration] = useState<{ phase: "loading" | "ready" | "missing"; key: string | null }>(() => ({ phase: providedKey === undefined ? "loading" : providedKey ? "ready" : "missing", key: providedKey ?? null }));
  const [point, setPoint] = useState<MapCoordinate | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [selection, setSelection] = useState<{ phase: "idle" | "loading" | "ready" | "unavailable"; address: string }>({ phase: "idle", address: "" });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ phase: "idle" | "loading" | "ready" | "unavailable"; results: MapSearchResult[] }>({ phase: "idle", results: [] });
  const center = useRef(IRAN_MAP_OVERVIEW);
  const session = useRef<ReturnType<typeof createAddressLookupSession> | null>(null);
  const alive = useRef(false);
  const focusSerial = useRef(0);

  useEffect(() => {
    alive.current = true;
    const current = createAddressLookupSession(reverseMapPoint);
    session.current = current;
    return () => { alive.current = false; current.close(); };
  }, []);

  useEffect(() => {
    if (providedKey !== undefined) return;
    let cancelled = false;
    void loadMapConfiguration().then(result => {
      if (!cancelled) setConfiguration({ phase: result.mapKey ? "ready" : "missing", key: result.mapKey });
    }).catch(() => { if (!cancelled) setConfiguration({ phase: "missing", key: null }); });
    return () => { cancelled = true; };
  }, [providedKey]);

  useEffect(() => {
    const term = normalizeSearchTerm(query);
    if (!term || configuration.phase !== "ready") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearch({ phase: "loading", results: [] });
      void searchMapPlaces({ term, ...center.current }).then(result => {
        if (!cancelled) setSearch(result.status === "ok" ? { phase: "ready", results: result.results } : { phase: "unavailable", results: [] });
      }).catch(() => { if (!cancelled) setSearch({ phase: "unavailable", results: [] }); });
    }, MAP_SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, configuration.phase]);

  async function selectPoint(coordinate: MapCoordinate) {
    setPoint(coordinate);
    setFocus({ coordinate, zoom: MAP_SELECTED_ZOOM, key: ++focusSerial.current });
    setSelection({ phase: "loading", address: "" });
    const result = await session.current?.select(coordinate);
    if (!alive.current || !result || result.status === "obsolete") return;
    setSelection(result.status === "ok" ? { phase: "ready", address: result.address } : { phase: "unavailable", address: "" });
  }

  const close = () => { alive.current = false; session.current?.close(); onClose(); };
  return <Dialog open onClose={close} titleId="address-map-title" title="انتخاب نشانی از نقشه" description="محل را جستجو کنید یا نقطهٔ دقیق را روی نقشه انتخاب کنید." size="map">
    <FormGrid>
      <MapCanvas mode={configuration.phase === "ready" ? "ready" : configuration.phase === "missing" ? "unavailable" : "loading"} mapKey={configuration.key} initialCenter={IRAN_MAP_OVERVIEW} initialZoom={IRAN_MAP_OVERVIEW_ZOOM} markers={point ? [{ id: "address", coordinate: point, label: "محل انتخاب‌شده" }] : []} focus={focus} onSelectPoint={coordinate => { void selectPoint(coordinate); }} onViewCenterChange={coordinate => { center.current = coordinate; }} unavailableMessage={unavailable} />
      <FormField>
        <FieldLabel htmlFor="address-map-search">جستجوی نشانی روی نقشه</FieldLabel>
        <input id="address-map-search" type="search" className={formControlClassName} value={query} disabled={configuration.phase !== "ready"} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} onChange={event => { setQuery(event.target.value); setSearch({ phase: "idle", results: [] }); }} />
        {search.phase === "loading" && <p role="status">در حال جستجو…</p>}
        {search.phase === "unavailable" && <InlineNotice tone="empty">جستجوی نشانی در دسترس نیست؛ می‌توانید نقطه را روی نقشه انتخاب کنید.</InlineNotice>}
        {search.phase === "ready" && (search.results.length ? search.results.map(result => <ActionButton key={result.id} variant="secondary" size="sm" onClick={() => { void selectPoint(result.coordinate); }}>{[result.title, result.address].filter(Boolean).join(" — ")}</ActionButton>) : <p>نتیجه‌ای پیدا نشد.</p>)}
        <FieldLabel htmlFor="address-map-preview">نشانی پیشنهادی</FieldLabel>
        <textarea id="address-map-preview" className={formControlClassName} rows={4} readOnly value={selection.address} />
        <div aria-live="polite">
          {selection.phase === "loading" && <p role="status">در حال خواندن نشانی نقطهٔ انتخاب‌شده…</p>}
          {selection.phase === "unavailable" && <InlineNotice tone="danger" role="alert">خواندن نشانی ممکن نشد. نقطهٔ دیگری انتخاب کنید یا نشانی را دستی وارد کنید.</InlineNotice>}
        </div>
        <FieldHint>پس از تأیید، می‌توانید نشانی را در فرم ویرایش و پلاک و جزئیات را تکمیل کنید.</FieldHint>
      </FormField>
    </FormGrid>
    <FormActions separated>
      <ActionButton disabled={selection.phase !== "ready"} onClick={() => { if (selection.phase === "ready") { session.current?.close(); alive.current = false; onConfirm(selection.address); } }}>استفاده از این نشانی</ActionButton>
      <ActionButton variant="secondary" onClick={close}>انصراف</ActionButton>
    </FormActions>
  </Dialog>;
}
