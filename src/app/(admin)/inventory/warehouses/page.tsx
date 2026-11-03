import type { Metadata } from "next";
import { WarehousesPage } from "@/features/inventory/presentation/warehouses/list/warehouses-page";
import type { WarehouseListSearchParams } from "@/features/inventory/presentation/warehouses/list/warehouse-list-navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "انبارها" };
export default async function WarehousesRoute({ searchParams }: { searchParams: Promise<WarehouseListSearchParams> }) { return <WarehousesPage searchParams={await searchParams} />; }
