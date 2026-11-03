import type { Metadata } from "next";
import { InventoryCatalogsPage } from "@/features/inventory/presentation/catalogs/inventory-catalogs-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اطلاعات پایه" };
export default function InventoryCatalogsRoute() { return <InventoryCatalogsPage />; }
