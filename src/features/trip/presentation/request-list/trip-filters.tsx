"use client";

import {
  ListFilterBar,
  ListSearchField,
  ListSelectField,
} from "@/components/ui/list-filters/list-filter-bar";
import { useListFilters } from "@/components/ui/list-filters/use-list-filters";
import { requestStatusLabel } from "../trip-status";

export function TripFilters({
  search,
  status,
  statuses,
}: {
  search: string;
  status: string;
  statuses: string[];
}) {
  const filters = useListFilters({
    values: { search, status },
    searchName: "search",
  });

  return (
    <ListFilterBar pending={filters.isPending}>
      <ListSearchField
        name="search"
        label="جستجوی سفرها"
        placeholder="جستجو در شماره درخواست، مبدأ، مقصد و …"
        value={filters.values.search}
        onChange={filters.changeSearch}
      />
      <ListSelectField
        name="status"
        label="وضعیت درخواست"
        value={filters.values.status}
        onChange={(value) => filters.applyFilter("status", value)}
      >
        <option value="">همهٔ وضعیت‌ها</option>
        {statuses.map((value) => (
          <option value={value} key={value}>
            {requestStatusLabel(value)}
          </option>
        ))}
      </ListSelectField>
    </ListFilterBar>
  );
}
