import { WorkOrderFormPage } from "@/features/maintenance/presentation/work-orders/form/work-order-form-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) { return <WorkOrderFormPage id={Number((await params).orderId)} />; }
