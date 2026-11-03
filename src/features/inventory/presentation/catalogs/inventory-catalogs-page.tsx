import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { makeReadInventoryReferences } from "../../composition/inventory-reference.factory";
import { InventoryCatalogPanel } from "./inventory-catalog-panel";
import styles from "./inventory-catalogs-page.module.css";

export async function InventoryCatalogsPage() {
  const reader = makeReadInventoryReferences();
  const [units, categories] = await Promise.allSettled([reader.units(), reader.categories()]);
  return <PageShell>
    <PageHeader eyebrow="قطعات و انبار" title="اطلاعات پایه" description="واحدهای شمارش و دسته‌بندی‌ها را تعریف کنید یا به مدیریت انبارها بروید." action={<ActionLink href="/inventory/warehouses">مدیریت انبارها</ActionLink>} />
    <div className={styles.sections}>
      <InventoryCatalogPanel kind="unit" entries={units.status === "fulfilled" ? units.value : []} hasLoadError={units.status === "rejected"} />
      <InventoryCatalogPanel kind="category" entries={categories.status === "fulfilled" ? categories.value : []} hasLoadError={categories.status === "rejected"} />
    </div>
  </PageShell>;
}
