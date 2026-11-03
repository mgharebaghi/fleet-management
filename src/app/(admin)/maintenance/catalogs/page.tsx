import { MaintenanceTypesPage } from "@/features/maintenance/presentation/types/maintenance-type-pages";
import type { MaintenanceSearchParams } from "@/features/maintenance/presentation/shared/list/maintenance-navigation";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<MaintenanceSearchParams> }) { return <MaintenanceTypesPage searchParams={await searchParams} />; }
