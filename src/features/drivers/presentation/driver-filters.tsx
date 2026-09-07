"use client";
import { ListFilterBar, ListSearchField } from "../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../components/ui/list-filters/use-list-filters";

export function DriverFilters({ search }: { search: string }) {
  const filters = useListFilters({ values: { search }, searchName: "search" });
  return <ListFilterBar><ListSearchField name="search" label="جستجوی رانندگان" placeholder="نام، نام خانوادگی، کد ملی یا شمارهٔ پرسنلی" value={filters.values.search} onChange={filters.changeSearch} /></ListFilterBar>;
}
