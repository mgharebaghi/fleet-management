import { MaintenanceRequestRecordPage } from "@/features/maintenance/presentation/requests/details/maintenance-request-record-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ requestId: string }> }) { return <MaintenanceRequestRecordPage id={Number((await params).requestId)} />; }
