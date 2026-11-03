import { WorkshopRecordPage } from "@/features/maintenance/presentation/workshops/workshop-pages";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ workshopId: string }> }) { return <WorkshopRecordPage id={Number((await params).workshopId)} />; }
