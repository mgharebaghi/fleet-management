import { connection } from "next/server";
import { readPendingTripRequestCount } from "@/features/trip/composition/trip-read-cache";
import { TripsLandingPage } from "@/features/trip/presentation/trip-landing-page";

export const metadata = { title: "سفرها" };

export default async function Page() {
  await connection();
  const pendingCount = await readPendingTripRequestCount();
  return <TripsLandingPage pendingCount={pendingCount} />;
}
