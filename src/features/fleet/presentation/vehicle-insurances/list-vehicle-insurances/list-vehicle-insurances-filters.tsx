"use client";

import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { ListFilterBar, ListSearchField, ListSelectField } from "../../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";

export function ListVehicleInsurancesFilters({ search, active }: { search: string; active: string }) {
  const filters = useListFilters({ values: { search, active }, searchName: "search" });
  return <ListFilterBar>
    <ListSearchField name="search" label="جستجوی بیمه خودرو" placeholder="کد یا پلاک خودرو، نوع، شرکت یا شماره بیمه‌نامه" value={filters.values.search} onChange={filters.changeSearch} />
    <ListSelectField name="active" label="وضعیت رکورد" value={filters.values.active} onChange={value => filters.applyFilter("active", value)}>
      <option value="active">فعال</option><option value="inactive">غیرفعال</option><option value="all">همه</option>
    </ListSelectField>
    {(search.trim() || active !== "active") && <ActionLink href="/fleet/vehicle-insurances" variant="quiet">پاک کردن</ActionLink>}
  </ListFilterBar>;
}
