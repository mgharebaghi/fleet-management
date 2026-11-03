import type { Metadata } from "next";
import { WarehouseRecordPage } from "@/features/inventory/presentation/warehouses/details/warehouse-record-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش انبار" };
export default async function EditWarehouseRoute({ params }: { params: Promise<{ warehouseId: string }> }) {
  return <WarehouseRecordPage warehouseId={Number((await params).warehouseId)} edit />;
}
