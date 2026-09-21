import { makeReadTrips } from "@/features/trip/composition/trip.factory";
import { TripsLandingPage } from "@/features/trip/presentation/trip-landing-page";

export const metadata = { title: "سفرها" };

export default async function Page() {
  const pendingCount = await makeReadTrips().countPendingRequests();
  return <TripsLandingPage pendingCount={pendingCount} />;
}
