import type { TripPassengerRecord, TripRoute } from "../../application/trip-records";

function normalizeRouteText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeRouteNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Number.isNaN(value) ? null : value;
}

function normalizeRouteDecimalString(
  value: string | null | undefined,
): string | null {
  const text = normalizeRouteText(value);
  if (text == null) return null;
  const num = Number(text);
  if (!Number.isNaN(num)) {
    return String(num);
  }
  return text;
}

function sortRoutePoints(points: TripRoute["points"]): TripRoute["points"] {
  return points
    .map((point, index) => ({ point, index }))
    .sort((a, b) => {
      const seqA = a.point.sequenceNo;
      const seqB = b.point.sequenceNo;
      if (seqA != null && seqB != null) {
        if (seqA !== seqB) return seqA - seqB;
        return a.index - b.index;
      }
      if (seqA != null) return -1;
      if (seqB != null) return 1;
      return a.index - b.index;
    })
    .map((item) => item.point);
}

export function areRoutesEquivalent(
  left: TripRoute,
  right: TripRoute,
): boolean {
  if (left === right) return true;
  if (left.routeId && right.routeId && left.routeId === right.routeId) {
    return true;
  }

  if (normalizeRouteText(left.routeName) !== normalizeRouteText(right.routeName)) {
    return false;
  }
  if (Boolean(left.isSelected) !== Boolean(right.isSelected)) {
    return false;
  }
  if (
    normalizeRouteNumber(left.alternativeNo) !==
    normalizeRouteNumber(right.alternativeNo)
  ) {
    return false;
  }
  if (
    normalizeRouteDecimalString(left.distanceKm) !==
    normalizeRouteDecimalString(right.distanceKm)
  ) {
    return false;
  }
  if (
    normalizeRouteNumber(left.estimatedDurationMinute) !==
    normalizeRouteNumber(right.estimatedDurationMinute)
  ) {
    return false;
  }
  if (
    normalizeRouteText(left.description) !== normalizeRouteText(right.description)
  ) {
    return false;
  }

  const leftPoints = sortRoutePoints(left.points ?? []);
  const rightPoints = sortRoutePoints(right.points ?? []);

  if (leftPoints.length !== rightPoints.length) {
    return false;
  }

  for (let index = 0; index < leftPoints.length; index++) {
    const pLeft = leftPoints[index];
    const pRight = rightPoints[index];

    if (pLeft.location.locationId !== pRight.location.locationId) {
      return false;
    }
    if (
      normalizeRouteNumber(pLeft.sequenceNo) !==
      normalizeRouteNumber(pRight.sequenceNo)
    ) {
      return false;
    }
    if (
      normalizeRouteText(pLeft.trafficZone) !==
      normalizeRouteText(pRight.trafficZone)
    ) {
      return false;
    }
    if (
      normalizeRouteDecimalString(pLeft.distanceFromStartKm) !==
      normalizeRouteDecimalString(pRight.distanceFromStartKm)
    ) {
      return false;
    }
    if (
      normalizeRouteText(pLeft.description) !==
      normalizeRouteText(pRight.description)
    ) {
      return false;
    }
  }

  return true;
}

export type DisplayRouteGroup = {
  route: TripRoute;
  passengerNames: string[];
  label?: string;
};

export function groupRoutesForDisplay(
  passengers: TripPassengerRecord[],
): DisplayRouteGroup[] {
  const groups: DisplayRouteGroup[] = [];

  for (const trip of passengers) {
    const passengerName =
      `${trip.passenger.firstName} ${trip.passenger.lastName}`.trim();

    const allRoutesForTrip = [
      ...trip.routes,
      ...trip.executions.flatMap((e) => e.routes),
    ];

    for (const route of allRoutesForTrip) {
      const existingGroup = groups.find((group) =>
        areRoutesEquivalent(group.route, route),
      );

      if (existingGroup) {
        if (passengerName && !existingGroup.passengerNames.includes(passengerName)) {
          existingGroup.passengerNames.push(passengerName);
        }
      } else {
        groups.push({
          route,
          passengerNames: passengerName ? [passengerName] : [],
        });
      }
    }
  }

  const hasMultipleRoutes = groups.length > 1;

  for (const group of groups) {
    if (!hasMultipleRoutes) {
      group.label = undefined;
    } else {
      if (group.passengerNames.length === 1) {
        group.label = `مسافر: ${group.passengerNames[0]}`;
      } else if (group.passengerNames.length > 1) {
        group.label = `مسافران: ${group.passengerNames.join("، ")}`;
      } else {
        group.label = undefined;
      }
    }
  }

  return groups;
}
