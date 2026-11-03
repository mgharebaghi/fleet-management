"use client";

import dynamic from "next/dynamic";
import { LoadingIndicator } from "../../components/ui/loading-indicator/loading-indicator";

import type { MapCoordinate, MapMarker, MapPath } from "../map-coordinate";
import styles from "./map-canvas.module.css";

const NeshanMapView = dynamic(
  () => import("./neshan-map-view").then((module) => module.NeshanMapView),
  {
    ssr: false,
    loading: () => <LoadingIndicator />,
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
  unavailableMessage: string;
};

export function MapCanvas({
  mode,
  mapKey,
  unavailableMessage,
  ...view
}: MapCanvasProps) {
  const showMap = mode === "ready" && mapKey !== null;
  return (
    <div className={styles.frame} data-loading-panel>
      {showMap ? (
        <NeshanMapView
          {...view}
          mapKey={mapKey}
          unavailableMessage={unavailableMessage}
        />
      ) : (
        mode === "unavailable" ? <p className={styles.message}>{unavailableMessage}</p> : <LoadingIndicator />
      )}
    </div>
  );
}
