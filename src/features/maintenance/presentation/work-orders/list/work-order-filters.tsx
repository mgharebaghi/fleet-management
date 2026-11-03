"use client";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { ListFilterBar, ListFilterField, ListSearchField, ListSelectField, listFilterGridClassName } from "../../../../../components/ui/list-filters/list-filter-bar";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import type { WorkOrderReferences, WorkOrderSearch } from "../../../application/work-orders/work-order-records";
import { maintenanceVehicleLabel } from "../../shared/vehicle/maintenance-vehicle-option";
import styles from "../../shared/form/maintenance-forms.module.css";
import { orderStatusLabels } from "../shared/work-order-presentation";
export function WorkOrderFilters({ criteria, references }: { criteria: WorkOrderSearch; references: WorkOrderReferences }) {
  const filters = useListFilters({ values: { search: criteria.search, status: criteria.status, vehicleId: String(criteria.vehicleId ?? "") }, defaults: { search: "", status: "", vehicleId: "" }, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}><FormGrid columns={12} className={listFilterGridClassName}>
    <div className={styles.third}><ListSearchField name="search" label="جستجوی پروندهٔ تعمیر" placeholder="شمارهٔ پرونده، خودرو، پلاک، نوع تعمیر، تعمیرگاه یا شرح مشکل" value={filters.values.search} onChange={filters.changeSearch} /></div>
    <div className={styles.third}><ListSelectField name="status" label="وضعیت پرونده" value={filters.values.status} onChange={value => filters.applyFilter("status", value)}><option value="">همهٔ وضعیت‌ها</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</ListSelectField></div>
    <ListFilterField className={styles.third}><SearchableSelect key={filters.values.vehicleId} name="order-vehicle-filter" label="خودرو" defaultValue={filters.values.vehicleId} onValueChange={value => filters.applyFilter("vehicleId", value)} normalizeQuery={normalizePersianSearchText} options={[{ value: "", label: "همهٔ خودروها", content: "همهٔ خودروها", searchText: "همه" }, ...references.vehicles.map(vehicle => ({ value: String(vehicle.id), label: maintenanceVehicleLabel(vehicle), content: maintenanceVehicleLabel(vehicle), searchText: maintenanceVehicleLabel(vehicle) }))]} /></ListFilterField>
  </FormGrid></ListFilterBar>;
}
