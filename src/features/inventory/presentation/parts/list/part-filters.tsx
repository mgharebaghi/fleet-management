"use client";

import { ListFilterBar, ListSearchField, ListSelectField } from "../../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";

export function PartFilters({ search, active }: { search: string; active: string }) {
  const filters = useListFilters({ values: { search, active }, defaults: { search: "", active: "active" }, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}>
    <ListSearchField name="search" label="جستجوی قطعه" placeholder="کد، نام، شمارهٔ فنی، سازنده، واحد یا دسته‌بندی" value={filters.values.search} onChange={filters.changeSearch} />
    <ListSelectField name="active" label="وضعیت قطعه" value={filters.values.active} onChange={value => filters.applyFilter("active", value)}>
      <option value="active">فعال</option><option value="inactive">غیرفعال</option><option value="all">همه</option>
    </ListSelectField>
  </ListFilterBar>;
}
