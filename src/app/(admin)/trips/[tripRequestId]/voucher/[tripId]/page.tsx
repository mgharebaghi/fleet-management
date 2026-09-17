import { TripVoucherPage } from "@/features/trip/presentation/trip-voucher";

export const metadata = { title: "قبض رسمی سفر" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tripRequestId: string; tripId: string }>;
  searchParams: Promise<{ assignmentId?: string | string[] }>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  const assignmentId = Array.isArray(query.assignmentId)
    ? query.assignmentId[0]
    : query.assignmentId;

  return (
    <TripVoucherPage
      tripRequestId={Number(route.tripRequestId)}
      tripId={Number(route.tripId)}
      assignmentId={Number(assignmentId)}
    />
  );
}
