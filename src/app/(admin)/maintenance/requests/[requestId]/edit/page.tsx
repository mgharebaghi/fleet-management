import { MaintenanceRequestFormPage } from "@/features/maintenance/presentation/requests/form/maintenance-request-form-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ requestId: string }> }) { return <MaintenanceRequestFormPage id={Number((await params).requestId)} />; }
