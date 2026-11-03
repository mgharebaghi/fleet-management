"use client";
import { useMemo } from "react";
import { ListFilterBar, ListSearchField, ListSelectField, ListFilterField } from "../../../../components/ui/list-filters/list-filter-bar";
import { SearchableSelect } from "../../../../components/ui/searchable-select/searchable-select";
import { useListFilters } from "../../../../components/ui/list-filters/use-list-filters";
import type { ServicePlanSearch, ServicePlanReferences } from "../../application/service-plans/service-plan-records";
import { normalizePersianSearchText } from "../../../../shared/text/persian-text";
import { maintenanceVehicleLabel } from "../shared/vehicle/maintenance-vehicle-option";
import { planStatuses } from "./service-plan-presentation";
const defaults = { search: "", status: "", vehicleId: "" };
export function ServicePlanFilters({ criteria, references }: { criteria: ServicePlanSearch; references: ServicePlanReferences }) {
  const values = useMemo(() => ({ search: criteria.search, status: criteria.status, vehicleId: String(criteria.vehicleId ?? "") }), [criteria.search, criteria.status, criteria.vehicleId]);
  const filters = useListFilters({ values, defaults, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}>
    <ListSearchField name="search" label="جستجوی برنامهٔ سرویس" placeholder="عنوان برنامه، خودرو، نوع سرویس یا یادداشت" value={filters.values.search} onChange={filters.changeSearch} />
    <ListSelectField name="status" label="وضعیت سرویس" value={filters.values.status} onChange={value => filters.applyFilter("status", value)}><option value="">همهٔ وضعیت‌ها</option>{Object.entries(planStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</ListSelectField>
    <ListFilterField><SearchableSelect name="plan-vehicle-filter" label="خودرو" defaultValue={filters.values.vehicleId} key={filters.values.vehicleId} normalizeQuery={normalizePersianSearchText} onValueChange={value => filters.applyFilter("vehicleId", value)} options={[{ value: "", label: "همهٔ خودروها", content: "همهٔ خودروها", searchText: "همه" }, ...references.vehicles.map(vehicle => ({ value: String(vehicle.id), label: maintenanceVehicleLabel(vehicle), content: maintenanceVehicleLabel(vehicle), searchText: maintenanceVehicleLabel(vehicle) }))]} /></ListFilterField>
  </ListFilterBar>;
}
