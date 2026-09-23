"use client";

import dynamic from "next/dynamic";

import type { MapCoordinate, MapMarker, MapPath } from "../map-coordinate";
import styles from "./map-canvas.module.css";

const NeshanMapView = dynamic(
  () => import("./neshan-map-view").then((module) => module.NeshanMapView),
  {
    ssr: false,
    loading: () => <p className={styles.message}>در حال بارگذاری نقشه…</p>,
  },
);

export type MapFocus = {
  coordinate: MapCoordinate;
  zoom: number;
  key: number;
};

export type MapCanvasProps = {
  /** "ready" mounts the provider map. Other modes stay on the fallback frame. */
  mode: "loading" | "unavailable" | "ready";
  mapKey: string | null;
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
};

export function MapCanvas({
  mode,
  mapKey,
  loadingMessage,
  unavailableMessage,
  ...view
}: MapCanvasProps) {
  const showMap = mode === "ready" && mapKey !== null;
  return (
    <div className={styles.frame}>
      {showMap ? (
        <NeshanMapView
          {...view}
          mapKey={mapKey}
          loadingMessage={loadingMessage}
          unavailableMessage={unavailableMessage}
        />
      ) : (
        <p className={styles.message}>
          {mode === "unavailable" ? unavailableMessage : loadingMessage}
        </p>
      )}
    </div>
  );
}
