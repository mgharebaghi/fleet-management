import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { BackLink } from "@/components/ui/back-link/back-link";
import { WarehouseForm } from "@/features/inventory/presentation/warehouses/form/warehouse-form";

export const metadata: Metadata = { title: "ثبت انبار" };
export default function CreateWarehouseRoute() {
  return <PageShell width="narrow"><PageHeader eyebrow="قطعات و انبار" title="ثبت انبار" action={<BackLink label="بازگشت به انبارها" href="/inventory/warehouses" />} compactAction /><WarehouseForm /></PageShell>;
}
