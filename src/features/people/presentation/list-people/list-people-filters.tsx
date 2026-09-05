"use client";

import { ActionLink } from "../../../../components/ui/action-link/action-link";
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
  hasCriteria: boolean;
};

export function ListPeopleFilters({
  initialSearch,
  initialStatus,
  hasCriteria,
}: ListPeopleFiltersProps) {
  const filters = useListFilters({
    values: { search: initialSearch, status: initialStatus },
    searchName: "search",
  });

  return (
    <ListFilterBar>
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

      {hasCriteria && (
        <ActionLink href="/people" variant="quiet">
          پاک کردن
        </ActionLink>
      )}
    </ListFilterBar>
  );
}
