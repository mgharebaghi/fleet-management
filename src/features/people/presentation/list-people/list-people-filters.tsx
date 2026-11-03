"use client";

import {
  ListFilterBar,
  ListSearchField,
  ListSelectField,
} from "../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../components/ui/list-filters/use-list-filters";

export type ListPeopleStatus = "active" | "inactive" | "all";

type ListPeopleFiltersProps = {
  initialSearch: string;
  initialStatus: ListPeopleStatus;
};

export function ListPeopleFilters({
  initialSearch,
  initialStatus,
}: ListPeopleFiltersProps) {
  const filters = useListFilters({
    values: { search: initialSearch, status: initialStatus },
    defaults: { search: "", status: "active" }, searchName: "search",
  });

  return (
    <ListFilterBar pending={filters.isPending} clear={filters.clear}>
      <ListSearchField
        label="جستجوی اشخاص"
        name="search"
        value={filters.values.search}
        placeholder="نام، نام خانوادگی، شماره پرسنلی یا کد ملی"
        onChange={filters.changeSearch}
      />

      <ListSelectField
        label="وضعیت"
        name="status"
        value={filters.values.status}
        onChange={(value) => filters.applyFilter("status", value)}
      >
        <option value="active">فعال</option>
        <option value="inactive">غیرفعال</option>
        <option value="all">همه</option>
      </ListSelectField>
    </ListFilterBar>
  );
}
