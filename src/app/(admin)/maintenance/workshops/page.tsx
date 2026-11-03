import { WorkshopsPage } from "@/features/maintenance/presentation/workshops/workshop-pages";
import type { MaintenanceSearchParams } from "@/features/maintenance/presentation/shared/list/maintenance-navigation";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<MaintenanceSearchParams> }) { return <WorkshopsPage searchParams={await searchParams} />; }
