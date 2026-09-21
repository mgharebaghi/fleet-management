import { CreateTripRequestPage } from "@/features/trip/presentation/create-request/create-trip-request-page";

export const metadata = { title: "ثبت درخواست سفر" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <CreateTripRequestPage />;
}
