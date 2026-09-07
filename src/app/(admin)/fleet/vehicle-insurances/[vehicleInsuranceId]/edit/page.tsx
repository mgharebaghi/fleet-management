import type { Metadata } from "next";

import { UpdateVehicleInsurancePage } from "@/features/fleet/presentation/vehicle-insurances/update-vehicle-insurance/update-vehicle-insurance-page";

export const metadata: Metadata = { title: "ویرایش بیمه خودرو" };

export default async function EditVehicleInsurancePage({
  params,
}: {
  params: Promise<{ vehicleInsuranceId: string }>;
}) {
  const { vehicleInsuranceId } = await params;
  return <UpdateVehicleInsurancePage vehicleInsuranceId={vehicleInsuranceId} />;
}
