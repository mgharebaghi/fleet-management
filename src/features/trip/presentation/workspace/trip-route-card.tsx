"use client";

import { useId, useState } from "react";

import {
  IconActionGroup,
} from "@/components/ui/icon-action-button/icon-action-button";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type {
  TripLocationReference,
  TripPassengerRecord,
  TripRoute,
} from "../../application/trip-records";
import { DeleteRouteButton } from "../route/delete-route-dialog";
import { RoutePlanMap } from "../route/route-plan-map";
import { TripRouteDialog } from "../route/trip-route-dialog";
import styles from "./trip-workspace.module.css";

export function togglePointsDisclosure(currentlyOpen: boolean): boolean {
  return !currentlyOpen;
}

function routeOwner(
  passengers: readonly TripPassengerRecord[],
  route: TripRoute,
): TripPassengerRecord | null {
  return (
    passengers.find((passenger) => passenger.tripId === route.tripId) ??
    passengers.find((passenger) =>
      passenger.executions.some((execution) =>
        execution.routes.some((item) => item.routeId === route.routeId),
      ),
    ) ??
    null
  );
}

export type RouteCardProps = {
  route: TripRoute;
  label?: string;
  tripRequestId?: number;
  passengers?: TripPassengerRecord[];
  locations?: TripLocationReference[];
  isPlanningFrozen?: boolean;
  defaultPointsOpen?: boolean;
  mapOpen?: boolean;
  onMapToggle?: () => void;
};

export function RouteCard({
  route,
  label,
  tripRequestId,
  passengers,
  locations,
  isPlanningFrozen,
  defaultPointsOpen = false,
  mapOpen = false,
  onMapToggle,
}: RouteCardProps) {
  const [pointsOpen, setPointsOpen] = useState(defaultPointsOpen);
  const pointsListId = useId();

  const owner = passengers ? routeOwner(passengers, route) : null;
  const orderedPoints = [...(route.points ?? [])].sort(
    (left, right) =>
      (left.sequenceNo ?? Number.MAX_SAFE_INTEGER) -
      (right.sequenceNo ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <article
      className={`${styles.routeCard} ${route.isSelected ? styles.routeCardSelected : ""}`}
    >
      <div className={styles.routeHeader}>
        <div className={styles.routeHeaderMain}>
          <div className={styles.routeTitleRow}>
            <h3 className={styles.routeName}>{route.routeName}</h3>
            <StatusBadge
              label={route.isSelected ? "مسیر اصلی" : "مسیر جایگزین"}
              tone={route.isSelected ? "positive" : "info"}
            />
          </div>
          {label && <p className={styles.routeOwnerLabel}>{label}</p>}
        </div>

        {!isPlanningFrozen && tripRequestId && (
          <div className={styles.routeHeaderActions}>
            <IconActionGroup>
              {passengers && locations && (
                <TripRouteDialog
                  tripRequestId={tripRequestId}
                  passengers={passengers}
                  locations={locations}
                  route={route}
                  tripId={route.tripId}
                  triggerVariant="icon"
                />
              )}
              <DeleteRouteButton
                tripRequestId={tripRequestId}
                route={route}
                variant="icon"
              />
            </IconActionGroup>
          </div>
        )}
      </div>

      <dl className={styles.routeSummary}>
        <div className={styles.routeFact}>
          <dt className={styles.routeFactLabel}>مسافت:</dt>
          <dd className={styles.routeFactValue}>
            {route.distanceKm ? `${route.distanceKm} کیلومتر` : "—"}
          </dd>
        </div>
        <div className={styles.routeFact}>
          <dt className={styles.routeFactLabel}>مدت تقریبی:</dt>
          <dd className={styles.routeFactValue}>
            {route.estimatedDurationMinute
              ? `${route.estimatedDurationMinute} دقیقه`
              : "—"}
          </dd>
        </div>
        {route.alternativeNo != null && !route.isSelected && (
          <div className={styles.routeFact}>
            <dt className={styles.routeFactLabel}>شماره جایگزین:</dt>
            <dd className={styles.routeFactValue}>{route.alternativeNo}</dd>
          </div>
        )}
      </dl>

      {onMapToggle && (
        <button
          type="button"
          className={styles.routeMapToggle}
          aria-expanded={mapOpen}
          onClick={onMapToggle}
        >
          {mapOpen ? "بستن نقشه" : "نمایش روی نقشه"}
        </button>
      )}

      {mapOpen && owner && (
        <RoutePlanMap
          origin={owner.origin}
          destination={owner.destination}
          intermediates={orderedPoints.map((point) => ({
            location: point.location,
          }))}
        />
      )}

      {route.description && (
        <p className={styles.routeDescription}>{route.description}</p>
      )}

      {orderedPoints.length === 0 ? (
        <p className={styles.routePointsEmpty}>
          نقطه‌ای برای این مسیر ثبت نشده است.
        </p>
      ) : (
        <div className={styles.routePointsSection}>
          <button
            type="button"
            className={styles.routePointsToggle}
            onClick={() => setPointsOpen(togglePointsDisclosure)}
            aria-expanded={pointsOpen}
            aria-controls={pointsListId}
          >
            <span className={styles.routePointsToggleTitle}>
              نقاط مسیر
              <span className={styles.routePointsCountBadge}>
                {orderedPoints.length} نقطه
              </span>
            </span>
            <span className={styles.routePointsToggleAction}>
              {pointsOpen ? "بستن نقاط ▴" : "نمایش نقاط ▾"}
            </span>
          </button>

          {pointsOpen && (
            <ol id={pointsListId} className={styles.routePoints}>
              {orderedPoints.map((point, index) => (
                <li key={point.routePointId} className={styles.routePointItem}>
                  <div className={styles.routePointBadge}>
                    <TechnicalValue>
                      {point.sequenceNo ?? index + 1}
                    </TechnicalValue>
                  </div>
                  <div className={styles.routePointBody}>
                    <strong className={styles.routePointName}>
                      {point.location.locationName}
                    </strong>
                    {(point.trafficZone || point.distanceFromStartKm) && (
                      <p className={styles.routePointMeta}>
                        {point.trafficZone && `محدوده ${point.trafficZone}`}
                        {point.trafficZone &&
                          point.distanceFromStartKm &&
                          " · "}
                        {point.distanceFromStartKm &&
                          `${point.distanceFromStartKm} کیلومتر از شروع`}
                      </p>
                    )}
                    {point.description && (
                      <p className={styles.routePointDescription}>
                        {point.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}
