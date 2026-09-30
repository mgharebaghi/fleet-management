import type { NewTripRouteDetails, TripAssignmentReference, TripLocationReference } from "../../application/trip-records";

export type TripPlanningPassenger = {
  key: number;
  personId: number;
  personName: string;
  personnelNo: string | null;
  nationalCode?: string | null;
  originName: string;
  destinationName: string;
  /** Trip origin. Map context only; it is not submitted as a RoutePoint. */
  originLocation?: TripLocationReference | null;
  /** Trip destination. Map context only; it is not submitted as a RoutePoint. */
  destinationLocation?: TripLocationReference | null;
  requestedPickupAt: string;
  requestedPickupLabel: string;
};

export type TripPlanningRoute = NewTripRouteDetails & {
  key: string;
  passengerKey: number;
};

export type TripPlanningAssignments = Record<
  number,
  TripAssignmentReference[]
>;

export function routePointLocationError(
  points: readonly { locationId: number | null }[],
): string | null {
  const missingIndex = points.findIndex((point) => !point.locationId);
  return missingIndex < 0
    ? null
    : `لطفاً مکان را برای نقطه ${missingIndex + 1} انتخاب کنید.`;
}
