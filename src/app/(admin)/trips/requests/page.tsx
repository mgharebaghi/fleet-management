import { TripsPage } from "@/features/trip/presentation/request-list/trip-request-list-page";

export const metadata = { title: "فهرست سفرها" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TripsPage searchParams={await searchParams} />;
}
