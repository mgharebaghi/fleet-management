import { ListVehiclesPage } from "@/features/fleet/presentation/vehicles/list-vehicles/list-vehicles-page";
export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ListVehiclesPage searchParams={await searchParams} />;
}
