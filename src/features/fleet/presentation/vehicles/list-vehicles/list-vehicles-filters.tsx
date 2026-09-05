"use client";

import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import {
  ListFilterBar,
  ListSearchField,
  ListSelectField,
} from "../../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";
import type { CatalogEntry } from "../../../application/catalogs/catalog-entry";

type ListVehiclesFiltersProps = {
  initialSearch: string;
  /** Operational status id as it appears in the URL; empty means every status. */
  initialStatus: string;
  initialActive: string;
  statuses: CatalogEntry[];
  hasCriteria: boolean;
};

export function ListVehiclesFilters({
  initialSearch,
  initialStatus,
  initialActive,
  statuses,
  hasCriteria,
}: ListVehiclesFiltersProps) {
  const filters = useListFilters({
    values: {
      search: initialSearch,
      status: initialStatus,
      active: initialActive,
    },
    searchName: "search",
  });

  return (
    <ListFilterBar>
      <ListSearchField
        label="جستجوی خودرو"
        name="search"
        value={filters.values.search}
        placeholder="کد، پلاک، برند، مدل، وضعیت یا شناسه فنی"
        onChange={filters.changeSearch}
      />

      <ListSelectField
        label="وضعیت عملیاتی"
        name="status"
        value={filters.values.status}
        onChange={(value) => filters.applyFilter("status", value)}
      >
        <option value="">همه وضعیت‌ها</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </ListSelectField>

      <ListSelectField
        label="فعال بودن رکورد"
        name="active"
        value={filters.values.active}
        onChange={(value) => filters.applyFilter("active", value)}
      >
        <option value="active">فعال</option>
        <option value="inactive">غیرفعال</option>
        <option value="all">همه</option>
      </ListSelectField>

      {hasCriteria && (
        <ActionLink href="/fleet/vehicles" variant="quiet">
          پاک کردن
        </ActionLink>
      )}
    </ListFilterBar>
  );
}
