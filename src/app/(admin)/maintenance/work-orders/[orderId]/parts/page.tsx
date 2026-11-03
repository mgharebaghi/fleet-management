import { WorkOrderRecordPage } from "@/features/maintenance/presentation/work-orders/details/work-order-record-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) { return <WorkOrderRecordPage id={Number((await params).orderId)} section="parts" />; }
