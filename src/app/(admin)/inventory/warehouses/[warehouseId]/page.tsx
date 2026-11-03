import type { Metadata } from "next";
import { WarehouseRecordPage } from "@/features/inventory/presentation/warehouses/details/warehouse-record-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اطلاعات انبار" };
export default async function WarehouseRoute({ params }: { params: Promise<{ warehouseId: string }> }) {
  return <WarehouseRecordPage warehouseId={Number((await params).warehouseId)} />;
}
