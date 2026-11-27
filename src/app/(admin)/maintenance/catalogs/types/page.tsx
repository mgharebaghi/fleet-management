import type { Metadata } from "next";
import { MaintenanceTypesPage } from "@/features/maintenance/presentation/types/maintenance-type-pages";
import type { MaintenanceSearchParams } from "@/features/maintenance/presentation/shared/list/maintenance-navigation";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "انواع تعمیر و سرویس" };
export default async function Page({ searchParams }: { searchParams: Promise<MaintenanceSearchParams> }) { return <MaintenanceTypesPage searchParams={await searchParams} />; }
