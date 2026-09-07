import { DriverDetailsPage } from "@/features/drivers/presentation/driver-pages";
export const metadata = { title: "پروندهٔ راننده" };
export default async function Page({ params }: { params: Promise<{ driverId: string }> }) {
  return <DriverDetailsPage driverId={Number((await params).driverId)} />;
}
