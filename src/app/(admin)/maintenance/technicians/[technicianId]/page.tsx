import { TechnicianRecordPage } from "@/features/maintenance/presentation/technicians/technician-pages";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ technicianId: string }> }) { return <TechnicianRecordPage id={Number((await params).technicianId)} />; }
