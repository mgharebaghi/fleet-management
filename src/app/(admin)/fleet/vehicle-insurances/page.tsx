import { ListVehicleInsurancesPage } from "@/features/fleet/presentation/vehicle-insurances/list-vehicle-insurances/list-vehicle-insurances-page";

export default async function VehicleInsurancesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ListVehicleInsurancesPage searchParams={await searchParams} />;
}
