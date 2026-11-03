import { MaintenanceRequestsPage } from "@/features/maintenance/presentation/requests/list/maintenance-requests-page";
import type { RequestSearchParams } from "@/features/maintenance/presentation/requests/shared/request-presentation";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<RequestSearchParams> }) { return <MaintenanceRequestsPage searchParams={await searchParams} />; }
