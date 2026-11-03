import { MaintenanceTypeRecordPage } from "@/features/maintenance/presentation/types/maintenance-type-pages";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ typeId: string }> }) { return <MaintenanceTypeRecordPage id={Number((await params).typeId)} />; }
