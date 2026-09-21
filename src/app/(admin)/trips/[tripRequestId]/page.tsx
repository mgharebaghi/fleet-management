import { notFound } from "next/navigation";

import { makeReadTrips } from "@/features/trip/composition/trip.factory";
import type { TripAssignmentReference } from "@/features/trip/application/trip-records";
import { TripRequestHandlingPage } from "@/features/trip/presentation/handling/trip-request-handling-page";
import { TripRequestDetailsPage } from "@/features/trip/presentation/workspace/trip-request-details-page";

export const metadata = { title: "پرونده سفر" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tripRequestId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ tripRequestId }, query] = await Promise.all([params, searchParams]);
  const tab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const id = Number(tripRequestId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const reader = makeReadTrips();
  const details = await reader.details(id);
  if (!details) notFound();

  if (details.status === "New") {
    const locations = await reader.availableLocations();
    const assignmentsByPassenger: Record<number, TripAssignmentReference[]> = {};
    for (const passenger of details.passengers) {
      const pickupTime =
        passenger.requestedPickupDateTime ?? details.requestedTravelDateTime;
      assignmentsByPassenger[passenger.tripId] =
        await reader.assignmentsActiveAt(pickupTime);
    }

    return (
      <TripRequestHandlingPage
        details={details}
        locations={locations}
        assignmentsByPassenger={assignmentsByPassenger}
      />
    );
  }

  return (
    <TripRequestDetailsPage
      tripRequestId={id}
      requestedTab={tab}
    />
  );
}
