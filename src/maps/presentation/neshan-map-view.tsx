"use client";

import { useEffect, useInsertionEffect, useRef, useState } from "react";

import "@neshan-maps-platform/maplibre-sdk/style.css";

import {
  mapCoordinateFromDegrees,
  type MapCoordinate,
  type MapMarker,
  type MapPath,
} from "../map-coordinate";
import type { MapFocus } from "./map-canvas";
import styles from "./map-canvas.module.css";

const NESHAN_STYLE_URL = "https://static.neshan.org/sdk/maplibre/styles/light.json";
const MAP_LOAD_TIMEOUT_MS = 12_000;
const SELECTED_MARKER_COLOR = "#113a6d";
const UNSELECTED_MARKER_COLOR = "#8aa0b8";
const PATH_SOURCE_ID = "map-path";
const PATH_LAYER_ID = "map-path-line";

type RuntimeMarker = {
  setLngLat: (lngLat: [number, number]) => RuntimeMarker;
  addTo: (map: RuntimeMap) => RuntimeMarker;
  getElement: () => HTMLElement;
  remove: () => void;
};

type RuntimeMap = {
  addControl: (control: unknown, position?: string) => void;
  flyTo: (options: {
    center: [number, number];
    zoom: number;
    essential: boolean;
  }) => void;
  getCenter: () => { lat: number; lng: number };
  on: (
    event: "load" | "error" | "click" | "moveend",
    handler: (event: { lngLat: { lat: number; lng: number } }) => void,
  ) => void;
  resize: () => void;
  remove: () => void;
  getSource: (id: string) => { setData: (data: MapPathCollection) => void } | undefined;
  addSource: (
    id: string,
    source: { type: "geojson"; data: MapPathCollection },
  ) => void;
  addLayer: (layer: {
    id: string;
    type: "line";
    source: string;
    layout: { "line-cap": "round"; "line-join": "round" };
    paint: { "line-color": string; "line-width": number };
  }) => void;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options: { padding: number; maxZoom: number; essential: boolean },
  ) => void;
};

type MapPathCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { id: string };
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }>;
};

type NeshanSdk = {
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    apiKey: string;
    minZoom: number;
    rtl: { lazy: boolean };
    locale: Record<string, string>;
  }) => RuntimeMap;
  Marker: new (options: { color: string }) => RuntimeMarker;
  NavigationControl: new (options: {
    showCompass: boolean;
    visualizePitch: boolean;
  }) => unknown;
};

export function NeshanMapView({
  mapKey,
  initialCenter,
  initialZoom,
  markers,
  paths = [],
  focus,
  onSelectPoint,
  onMarkerSelect,
  onViewCenterChange,
  loadingMessage,
  unavailableMessage,
}: {
  mapKey: string;
  initialCenter: MapCoordinate;
  initialZoom: number;
  markers: readonly MapMarker[];
  paths?: readonly MapPath[];
  focus: MapFocus | null;
  onSelectPoint?: (coordinate: MapCoordinate) => void;
  onMarkerSelect?: (markerId: string) => void;
  onViewCenterChange?: (coordinate: MapCoordinate) => void;
  loadingMessage: string;
  unavailableMessage: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<RuntimeMap | null>(null);
  const sdkRef = useRef<NeshanSdk | null>(null);
  const markersRef = useRef(
    new globalThis.Map<string, { marker: RuntimeMarker; color: string }>(),
  );
  const onSelectRef = useRef(onSelectPoint);
  const onMarkerRef = useRef(onMarkerSelect);
  const onViewRef = useRef(onViewCenterChange);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );

  useInsertionEffect(() => {
    onSelectRef.current = onSelectPoint;
    onMarkerRef.current = onMarkerSelect;
    onViewRef.current = onViewCenterChange;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let map: RuntimeMap | null = null;
    let observer: ResizeObserver | null = null;
    let loadTimer = 0;

    void import("@neshan-maps-platform/maplibre-sdk")
      .then((module) => {
        if (disposed) return;
        const sdk = module.default as unknown as NeshanSdk;
        sdkRef.current = sdk;
        try {
          map = new sdk.Map({
            container,
            style: NESHAN_STYLE_URL,
            center: [
              Number(initialCenter.longitude),
              Number(initialCenter.latitude),
            ],
            zoom: initialZoom,
            minZoom: 4,
            apiKey: mapKey,
            rtl: { lazy: false },
            locale: {
              "NavigationControl.ZoomIn": "بزرگ‌نمایی",
              "NavigationControl.ZoomOut": "کوچک‌نمایی",
            },
          });
        } catch {
          if (!disposed) setStatus("unavailable");
          return;
        }
        if (disposed) {
          map.remove();
          map = null;
          return;
        }
        mapRef.current = map;
        map.addControl(
          new sdk.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          "top-left",
        );
        let loaded = false;
        loadTimer = window.setTimeout(() => {
          if (!disposed && !loaded) setStatus("unavailable");
        }, MAP_LOAD_TIMEOUT_MS);
        map.on("load", () => {
          loaded = true;
          window.clearTimeout(loadTimer);
          if (!disposed) setStatus("ready");
        });
        map.on("error", () => {
          if (!disposed && !loaded) setStatus("unavailable");
        });
        map.on("click", (event) => {
          const coordinate = mapCoordinateFromDegrees(
            event.lngLat.lat,
            event.lngLat.lng,
          );
          if (coordinate) onSelectRef.current?.(coordinate);
        });
        map.on("moveend", () => {
          const center = map?.getCenter();
          if (!center) return;
          const coordinate = mapCoordinateFromDegrees(center.lat, center.lng);
          if (coordinate) onViewRef.current?.(coordinate);
        });
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container);
      })
      .catch(() => {
        if (!disposed) setStatus("unavailable");
      });

    const liveMarkers = markersRef.current;
    return () => {
      disposed = true;
      window.clearTimeout(loadTimer);
      observer?.disconnect();
      for (const entry of liveMarkers.values()) entry.marker.remove();
      liveMarkers.clear();
      map?.remove();
      mapRef.current = null;
      sdkRef.current = null;
    };
  }, [
    initialCenter.latitude,
    initialCenter.longitude,
    initialZoom,
    mapKey,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const sdk = sdkRef.current;
    if (!map || !sdk || status !== "ready") return;
    const seen = new Set<string>();
    for (const marker of markers) {
      seen.add(marker.id);
      const lngLat: [number, number] = [
        Number(marker.coordinate.longitude),
        Number(marker.coordinate.latitude),
      ];
      const color =
        marker.selected === false
          ? UNSELECTED_MARKER_COLOR
          : SELECTED_MARKER_COLOR;
      const existing = markersRef.current.get(marker.id);
      if (existing && existing.color === color) {
        existing.marker.setLngLat(lngLat);
        continue;
      }
      existing?.marker.remove();
      const created = new sdk.Marker({ color }).setLngLat(lngLat).addTo(map);
      const element = created.getElement();
      element.style.cursor = "pointer";
      if (marker.label) element.setAttribute("aria-label", marker.label);
      if (marker.selected) element.dataset.selected = "true";
      const markerId = marker.id;
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onMarkerRef.current?.(markerId);
      });
      markersRef.current.set(marker.id, { marker: created, color });
    }
    for (const [id, entry] of markersRef.current) {
      if (seen.has(id)) continue;
      entry.marker.remove();
      markersRef.current.delete(id);
    }
  }, [markers, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const collection = pathCollection(paths);
    const source = map.getSource(PATH_SOURCE_ID);
    if (source) {
      source.setData(collection);
    } else {
      map.addSource(PATH_SOURCE_ID, { type: "geojson", data: collection });
      map.addLayer({
        id: PATH_LAYER_ID,
        type: "line",
        source: PATH_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": SELECTED_MARKER_COLOR, "line-width": 4 },
      });
    }
    const bounds = pathBounds(paths);
    if (bounds) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, essential: true });
    }
  }, [paths, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || status !== "ready") return;
    map.flyTo({
      center: [Number(focus.coordinate.longitude), Number(focus.coordinate.latitude)],
      zoom: focus.zoom,
      essential: true,
    });
  }, [focus, status]);

  return (
    <>
      <div ref={containerRef} className={styles.canvas} />
      {status !== "ready" && (
        <p className={styles.message}>
          {status === "unavailable" ? unavailableMessage : loadingMessage}
        </p>
      )}
    </>
  );
}

function pathCollection(paths: readonly MapPath[]): MapPathCollection {
  return {
    type: "FeatureCollection",
    features: paths
      .filter((path) => path.coordinates.length >= 2)
      .map((path) => ({
        type: "Feature",
        properties: { id: path.id },
        geometry: {
          type: "LineString",
          coordinates: path.coordinates.map((coordinate) => [
            Number(coordinate.longitude),
            Number(coordinate.latitude),
          ]),
        },
      })),
  };
}

function pathBounds(
  paths: readonly MapPath[],
): [[number, number], [number, number]] | null {
  const coordinates = paths.flatMap((path) =>
    path.coordinates.length >= 2 ? path.coordinates : [],
  );
  if (coordinates.length < 2) return null;
  let west = Number(coordinates[0].longitude);
  let east = west;
  let south = Number(coordinates[0].latitude);
  let north = south;
  for (const coordinate of coordinates) {
    const longitude = Number(coordinate.longitude);
    const latitude = Number(coordinate.latitude);
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  return [
    [west, south],
    [east, north],
  ];
}
