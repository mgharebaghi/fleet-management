import { WorkOrdersPage } from "@/features/maintenance/presentation/work-orders/list/work-orders-page";
import type { OrderSearchParams } from "@/features/maintenance/presentation/work-orders/shared/work-order-presentation";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<OrderSearchParams> }) { return <WorkOrdersPage searchParams={await searchParams} />; }
