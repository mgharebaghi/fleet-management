import type { Metadata } from "next";

import { VehicleDetailsPage } from "@/features/fleet/presentation/vehicles/vehicle-details/vehicle-details-page";

export const metadata: Metadata = { title: "پروندهٔ خودرو" };

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  return <VehicleDetailsPage vehicleId={Number((await params).vehicleId)} />;
}
