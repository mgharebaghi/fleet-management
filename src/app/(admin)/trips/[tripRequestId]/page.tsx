import { notFound } from "next/navigation";

import { makeReadTrips } from "@/features/trip/composition/trip.factory";
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
    const assignmentsByPassenger = await reader.assignmentsByPassenger(details.passengers, details.requestedTravelDateTime);

    const activePassengerCountsByVehicle =
      await reader.activePassengerCountsByVehicle([
        ...new Set(
          Object.values(assignmentsByPassenger).flatMap((assignments) =>
            assignments.map((assignment) => assignment.vehicle.vehicleId),
          ),
        ),
      ]);

    return (
      <TripRequestHandlingPage
        details={details}
        locations={locations}
        assignmentsByPassenger={assignmentsByPassenger}
        activePassengerCountsByVehicle={activePassengerCountsByVehicle}
      />
    );
  }

  return (
    <TripRequestDetailsPage
      tripRequestId={id}
      details={details}
      requestedTab={tab}
    />
  );
}
