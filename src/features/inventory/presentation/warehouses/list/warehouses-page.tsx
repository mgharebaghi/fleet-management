import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { WarehouseRowActions } from "./warehouse-row-actions";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import { RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail, RecordCardList } from "../../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import type { Warehouse, WarehouseListItem } from "../../../application/reference-data/inventory-reference-records";
import { makeReadInventoryReferences } from "../../../composition/inventory-reference.factory";
import { WarehouseFilters } from "./warehouse-filters";
import { parseWarehouseListParams, warehousePageHref, type WarehouseListSearchParams } from "./warehouse-list-navigation";

const stateBadge = (warehouse: Warehouse) => <StatusBadge label={warehouse.isActive ? "فعال" : "غیرفعال"} tone={warehouse.isActive ? "positive" : "negative"} />;
const details = (warehouse: WarehouseListItem) => <WarehouseRowActions warehouse={warehouse} />;

export async function WarehousesPage({ searchParams }: { searchParams: WarehouseListSearchParams }) {
  const criteria = parseWarehouseListParams(searchParams);
  let result;
  try { result = await makeReadInventoryReferences().warehouses(criteria); }
  catch { return <PageShell><PageHeader eyebrow="قطعات و انبار" title="انبارها" /><ResultState variant="error" title="دریافت اطلاعات انبارها امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/inventory/warehouses">تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell>
    <PageHeader eyebrow="قطعات و انبار" title="انبارها" description="انبارها را با کد، نام یا محل جستجو و اطلاعات آن‌ها را مدیریت کنید." action={<ActionLink href="/inventory/warehouses/create" variant="primary">ثبت انبار</ActionLink>} />
    <WarehouseFilters search={criteria.search} active={criteria.active} />
    {result.warehouses.length ? <>
      <DataTable caption="فهرست انبارها">
        <thead><tr><th scope="col">کد انبار</th><th scope="col">نام انبار</th><th scope="col">نشانی یا محل</th><th scope="col">وضعیت</th><th scope="col">عملیات</th></tr></thead>
        <tbody>{result.warehouses.map(warehouse => <tr key={warehouse.id}><td><TechnicalValue>{warehouse.code}</TechnicalValue></td><td>{warehouse.name}</td><td>{warehouse.location ?? "—"}</td><td>{stateBadge(warehouse)}</td><td>{details(warehouse)}</td></tr>)}</tbody>
      </DataTable>
      <RecordCardList>{result.warehouses.map(warehouse => <RecordCard key={warehouse.id}>
        <RecordCardHeader title={warehouse.name} badge={stateBadge(warehouse)} />
        <RecordCardDetails><RecordCardDetail label="کد انبار"><TechnicalValue>{warehouse.code}</TechnicalValue></RecordCardDetail><RecordCardDetail label="نشانی یا محل">{warehouse.location ?? "ثبت نشده"}</RecordCardDetail></RecordCardDetails>
        {details(warehouse)}
      </RecordCard>)}</RecordCardList>
    </> : <ResultState title="انباری برای نمایش وجود ندارد" description="یک انبار ثبت کنید یا جستجو و فیلتر را تغییر دهید." action={<ActionLink href="/inventory/warehouses?active=all">نمایش همهٔ انبارها</ActionLink>} />}
    <Pagination label="صفحه‌های انبارها" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => warehousePageHref(searchParams, page)} />
  </PageShell>;
}
