"use client";

import { useEffect, useRef, useState } from "react";

import type { MapCoordinate, MapPath } from "../../../../maps/map-coordinate";
import type { MapRoute } from "../../../../maps/map-route";
import { MapCanvas, type MapFocus } from "../../../../maps/presentation/map-canvas";
import {
  loadMapConfiguration,
  loadMapRoute,
} from "../../../../maps/presentation/map-place.actions";
import { MAP_SELECTED_ZOOM } from "../../../../maps/map-coordinate";
import type { TripLocationReference } from "../../application/trip-records";
import {
  ROUTE_ASSIST_DEBOUNCE_MS,
  ROUTE_PLAN_INCOMPLETE_POINT_MESSAGE,
  ROUTE_PLAN_MISSING_ENDPOINT_MESSAGE,
  ROUTE_PLAN_MISSING_INTERMEDIATE_MESSAGE,
  ROUTE_PLAN_ROUTING_UNAVAILABLE_MESSAGE,
  readinessForLocations,
  routeCoordinateKey,
} from "./route-plan-assist";
import styles from "./route-plan-map.module.css";
import {
  routePlanMarkers,
  routePlanStops,
  type RoutePlanIntermediate,
  type RoutePlanStop,
} from "./route-plan-markers";

type RouteLookupEntry =
  | { status: "ok"; route: MapRoute }
  | { status: "unavailable" };

const MAP_LOADING_MESSAGE = "در حال بارگذاری نقشه…";
const MAP_UNAVAILABLE_MESSAGE =
  "نقشه در دسترس نیست. ثبت مسیر بدون نقشه ادامه دارد.";

export function RoutePlanMap({
  origin,
  destination,
  intermediates,
  mapKey: mapKeyProp,
  onRoute,
}: {
  origin: TripLocationReference | null;
  destination: TripLocationReference | null;
  intermediates: readonly RoutePlanIntermediate[];
  /** Tests pass null to force the unavailable map. Omit to load the runtime key. */
  mapKey?: string | null;
  onRoute?: (route: MapRoute | null) => void;
}) {
  const stops = routePlanStops({ origin, destination, intermediates });
  const readiness = readinessForLocations({ origin, destination, intermediates });
  const requestKey =
    readiness.status === "ready" ? routeCoordinateKey(readiness.coordinates) : "";
  const coordinates =
    readiness.status === "ready" ? readiness.coordinates : [];
  const coordinatesRef = useRef(coordinates);
  const onRouteRef = useRef(onRoute);
  const entriesRef = useRef<Record<string, RouteLookupEntry>>({});
  const [entries, setEntries] = useState<Record<string, RouteLookupEntry>>({});
  const entry = requestKey ? entries[requestKey] : undefined;
  const route = entry?.status === "ok" ? entry.route : null;
  const routingPhase: "idle" | "loading" | "unavailable" = !requestKey
    ? "idle"
    : entry?.status === "ok"
      ? "idle"
      : entry?.status === "unavailable"
        ? "unavailable"
        : "loading";
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusKey = useRef(0);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [mapPhase, setMapPhase] = useState<"loading" | "ready" | "missing">(
    () => (mapKeyProp === undefined ? "loading" : mapKeyProp ? "ready" : "missing"),
  );
  const [mapKey, setMapKey] = useState<string | null>(mapKeyProp ?? null);

  useEffect(() => {
    coordinatesRef.current = coordinates;
    onRouteRef.current = onRoute;
    entriesRef.current = entries;
  });

  useEffect(() => {
    if (!requestKey) return;
    const existing = entriesRef.current[requestKey];
    if (existing?.status === "ok") {
      onRouteRef.current?.(existing.route);
      return;
    }
    if (existing) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadMapRoute({ coordinates: coordinatesRef.current })
        .then((result) => {
          if (cancelled) return;
          const next: RouteLookupEntry =
            result.status === "ok"
              ? { status: "ok", route: result.route }
              : { status: "unavailable" };
          setEntries((current) => ({ ...current, [requestKey]: next }));
          if (next.status === "ok") onRouteRef.current?.(next.route);
        })
        .catch(() => {
          if (!cancelled) {
            setEntries((current) => ({
              ...current,
              [requestKey]: { status: "unavailable" },
            }));
          }
        });
    }, ROUTE_ASSIST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [requestKey]);

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

  function focusStop(stop: RoutePlanStop) {
    if (!stop.coordinate) return;
    focusKey.current += 1;
    setFocusedId(stop.id);
    setFocus({
      coordinate: stop.coordinate,
      zoom: MAP_SELECTED_ZOOM,
      key: focusKey.current,
    });
  }

  const notice = routeNotice(readiness.status, routingPhase);
  const canDrawMap = readiness.status === "ready";
  const mapMode =
    mapPhase === "ready" && mapKey
      ? "ready"
      : mapPhase === "missing"
        ? "unavailable"
        : "loading";
  const path: MapPath[] =
    route && route.path.length >= 2
      ? [{ id: "road", coordinates: route.path }]
      : [];
  const initialCenter: MapCoordinate | null = coordinates[0] ?? null;

  return (
    <div className={styles.layout}>
      {canDrawMap && initialCenter ? (
        <div className={styles.mapSlot}>
          <MapCanvas
            mode={mapMode}
            mapKey={mapKey}
            initialCenter={initialCenter}
            initialZoom={12}
            markers={routePlanMarkers(stops, focusedId)}
            paths={path}
            focus={focus}
            onMarkerSelect={(markerId) => {
              const stop = stops.find((item) => item.id === markerId);
              if (stop) focusStop(stop);
            }}
            loadingMessage={MAP_LOADING_MESSAGE}
            unavailableMessage={MAP_UNAVAILABLE_MESSAGE}
          />
        </div>
      ) : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </div>
  );
}

function routeNotice(
  readiness: ReturnType<typeof readinessForLocations>["status"],
  routingPhase: "idle" | "loading" | "unavailable",
): string | null {
  if (readiness === "missing-endpoint") return ROUTE_PLAN_MISSING_ENDPOINT_MESSAGE;
  if (readiness === "missing-intermediate") {
    return ROUTE_PLAN_MISSING_INTERMEDIATE_MESSAGE;
  }
  if (readiness === "incomplete-point") return ROUTE_PLAN_INCOMPLETE_POINT_MESSAGE;
  if (routingPhase === "loading") return "در حال محاسبه مسیر…";
  if (routingPhase === "unavailable") return ROUTE_PLAN_ROUTING_UNAVAILABLE_MESSAGE;
  return null;
}
