import { TripVoucherPage } from "@/features/trip/presentation/trip-voucher";

export const metadata = { title: "برگه مأموریت سفر — نسخه راننده" };

export default async function Page({
  params,
}: {
  params: Promise<{ tripRequestId: string; tripId: string }>;
}) {
  const route = await params;
  return (
    <TripVoucherPage
      tripRequestId={Number(route.tripRequestId)}
      tripId={Number(route.tripId)}
    />
  );
}
