"use client";
import { useMemo } from "react";
import { ListFilterBar, ListSearchField } from "../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../components/ui/list-filters/use-list-filters";
const defaults = { search: "" };
export function VehicleMeterFilters({ search }: { search: string }) {
  const values = useMemo(() => ({ search }), [search]);
  const filters = useListFilters({ values, defaults, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}><ListSearchField name="search" label="جستجوی سوابق کارکرد" placeholder="کیلومتر، ساعت کارکرد یا یادداشت" value={filters.values.search} onChange={filters.changeSearch} /></ListFilterBar>;
}
