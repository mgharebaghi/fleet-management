import type { Metadata } from "next";

import { UpdateVehiclePage } from "@/features/fleet/presentation/vehicles/update-vehicle/update-vehicle-page";

export const metadata: Metadata = { title: "ویرایش خودرو" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  return <UpdateVehiclePage vehicleId={Number((await params).vehicleId)} />;
}
