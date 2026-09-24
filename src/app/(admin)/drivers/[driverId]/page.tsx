import { DriverDetailsPage } from "@/features/drivers/presentation/driver-pages";
export const metadata = { title: "پروندهٔ راننده" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const query = await searchParams;
  const tab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  return <DriverDetailsPage driverId={Number((await params).driverId)} tab={tab} />;
}
