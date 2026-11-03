import { TechniciansPage } from "@/features/maintenance/presentation/technicians/technician-pages";
import type { MaintenanceSearchParams } from "@/features/maintenance/presentation/shared/list/maintenance-navigation";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<MaintenanceSearchParams> }) { return <TechniciansPage searchParams={await searchParams} />; }
