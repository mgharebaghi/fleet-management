"use client";
import { ListFilterBar, ListFilterField, ListSearchField, ListSelectField, listFilterGridClassName } from "../../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { JalaliDatePicker } from "../../../../../components/ui/date-picker/jalali-date-picker";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import styles from "./stock-filters.module.css";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import type { StockReferences, StockSearch } from "../../../application/stock/stock-records";
import { stockTypeLabels } from "../shared/stock-messages";

export function StockFilters({ criteria, references, movements }: { criteria: StockSearch; references: StockReferences; movements: boolean }) {
  const filters = useListFilters({ values: { search: criteria.search, warehouseId: String(criteria.warehouseId ?? ""), partId: String(criteria.partId ?? ""), ...(movements ? { type: criteria.type, from: criteria.from, to: criteria.to } : {}) }, defaults: { search: "", warehouseId: "", partId: "", ...(movements ? { type: "", from: "", to: "" } : {}) }, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}>
    <FormGrid columns={12} className={listFilterGridClassName}>
    <div className={styles.field}><ListSearchField name="search" label="جستجوی موجودی و گردش" placeholder="نام یا کد قطعه، انبار یا واحد" value={filters.values.search} onChange={filters.changeSearch} /></div>
    <ListFilterField className={styles.field}><SearchableSelect key={filters.values.warehouseId} name="stock-warehouse-filter" label="انبار" defaultValue={filters.values.warehouseId} onValueChange={value => filters.applyFilter("warehouseId", value)} normalizeQuery={normalizePersianSearchText} options={[{ value: "", label: "همهٔ انبارها", content: "همهٔ انبارها", searchText: "همه" }, ...references.warehouses.map(row => ({ value: String(row.id), label: `${row.name} — ${row.code}`, content: `${row.name}${row.active ? "" : " (غیرفعال)"} — ${row.code}`, searchText: `${row.name} ${row.code}` }))]}  /></ListFilterField>
    <ListFilterField className={styles.field}><SearchableSelect key={filters.values.partId} name="stock-part-filter" label="قطعه" defaultValue={filters.values.partId} onValueChange={value => filters.applyFilter("partId", value)} normalizeQuery={normalizePersianSearchText} options={[{ value: "", label: "همهٔ قطعات", content: "همهٔ قطعات", searchText: "همه" }, ...references.parts.map(row => ({ value: String(row.id), label: `${row.name} — ${row.code}`, content: `${row.name}${row.active ? "" : " (غیرفعال)"} — ${row.code}`, searchText: `${row.name} ${row.code}` }))]}  /></ListFilterField>
    {movements && <>
      <div className={styles.field}><ListSelectField name="type" label="نوع گردش" value={filters.values.type ?? ""} onChange={value => filters.applyFilter("type", value)}><option value="">همهٔ گردش‌ها</option>{Object.entries(stockTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</ListSelectField></div>
      {(["from", "to"] as const).map(field => <ListFilterField key={field} className={styles.field}><div onInputCapture={event => { const input = event.target; if (input instanceof HTMLInputElement && input.name === `stock-${field}-filter`) filters.applyFilter(field, input.value); }}><JalaliDatePicker key={`${field}:${filters.values[field] ?? ""}`} name={`stock-${field}-filter`} label={field === "from" ? "از تاریخ" : "تا تاریخ"} defaultValue={filters.values[field] ?? ""} /></div></ListFilterField>)}
    </>}
    </FormGrid>
  </ListFilterBar>;
}
