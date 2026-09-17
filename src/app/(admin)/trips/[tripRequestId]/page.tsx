import { TripRequestDetailsPage } from "@/features/trip/presentation/trip-pages";

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
  return (
    <TripRequestDetailsPage
      tripRequestId={Number(tripRequestId)}
      requestedTab={tab}
    />
  );
}
