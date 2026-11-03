import type { Metadata } from "next";
import { VehicleMeterPage, type VehicleMeterSearchParams } from "@/features/fleet/presentation/meter-readings/vehicle-meter-page";
export const metadata: Metadata = { title: "کارکرد خودرو" };
export default async function Page({ params, searchParams }: { params: Promise<{ vehicleId: string }>; searchParams: Promise<VehicleMeterSearchParams> }) {
  const [route, query] = await Promise.all([params, searchParams]);
  return <VehicleMeterPage vehicleId={Number(route.vehicleId)} searchParams={query} />;
}
