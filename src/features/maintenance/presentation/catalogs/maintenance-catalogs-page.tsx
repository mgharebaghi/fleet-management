import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { MaintenanceTypeCatalogPanel } from "./maintenance-type-catalog-panel";
import styles from "./maintenance-catalogs-page.module.css";

async function readCatalog() {
  const reader = makeMaintenanceReferences();
  const query = { search: "", active: "all" } as const;
  const first = await reader.types({ ...query, page: 1 });
  if (!first.rows.length || first.rows.length >= first.totalCount) return first.rows;
  const rest = await Promise.all(Array.from(
    { length: Math.ceil(first.totalCount / first.rows.length) - 1 },
    (_, index) => reader.types({ ...query, page: index + 2 }),
  ));
  return [...first.rows, ...rest.flatMap(page => page.rows)];
}

export async function MaintenanceCatalogsPage() {
  const entries = await readCatalog().catch(() => null);
  return <PageShell>
    <PageHeader eyebrow="تعمیرات و نگهداری" title="اطلاعات پایه" />
    <div className={styles.slot}>
      <MaintenanceTypeCatalogPanel entries={entries} />
    </div>
  </PageShell>;
}
