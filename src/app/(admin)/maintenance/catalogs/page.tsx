import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MaintenanceCatalogsPage } from "../../../../features/maintenance/presentation/catalogs/maintenance-catalogs-page";
import type { MaintenanceSearchParams } from "../../../../features/maintenance/presentation/shared/list/maintenance-navigation";

export const metadata: Metadata = { title: "اطلاعات پایه" };

export default async function Page({ searchParams }: { searchParams: Promise<MaintenanceSearchParams> }) {
  const params = await searchParams;
  // Bookmarked links to the old, filtered type list still work.
  if (["search", "active", "page"].some(key => params[key] !== undefined)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
    }
    redirect(`/maintenance/catalogs/types?${query}`);
  }
  return <MaintenanceCatalogsPage />;
}
