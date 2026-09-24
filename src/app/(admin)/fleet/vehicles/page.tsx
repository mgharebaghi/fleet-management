import { ListVehiclesPage } from "@/features/fleet/presentation/vehicles/list-vehicles/list-vehicles-page";

// Prisma reads aren't a fetch/Request-time API, so Next.js would otherwise
// prerender this route once at build time and client navigation would skip
// the shared admin loading boundary.
export const dynamic = "force-dynamic";

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ListVehiclesPage searchParams={await searchParams} />;
}
