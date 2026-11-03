"use client";
import { ListFilterBar, ListSearchField, ListSelectField } from "../../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";
import type { ReferenceSearch } from "../../../application/reference-data/maintenance-reference-records";
export function MaintenanceListFilters({ criteria, label, placeholder }: { criteria: ReferenceSearch; label: string; placeholder: string }) {
  const filters = useListFilters({ values: { search: criteria.search, active: criteria.active }, defaults: { search: "", active: "active" }, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}><ListSearchField name="search" label={label} placeholder={placeholder} value={filters.values.search} onChange={filters.changeSearch} /><ListSelectField name="active" label="وضعیت" value={filters.values.active} onChange={value => filters.applyFilter("active", value)}><option value="active">فعال</option><option value="inactive">غیرفعال</option><option value="all">همه</option></ListSelectField></ListFilterBar>;
}
