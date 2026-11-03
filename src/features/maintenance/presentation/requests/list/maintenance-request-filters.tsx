"use client";
import { FormGrid } from "../../../../../components/ui/form-grid/form-grid";
import { ListFilterBar, ListFilterField, ListSearchField, ListSelectField, listFilterGridClassName } from "../../../../../components/ui/list-filters/list-filter-bar";
import { useListFilters } from "../../../../../components/ui/list-filters/use-list-filters";
import { SearchableSelect } from "../../../../../components/ui/searchable-select/searchable-select";
import { normalizePersianSearchText } from "../../../../../shared/text/persian-text";
import type { RequestReferences, RequestSearch } from "../../../application/requests/maintenance-request-records";
import { requestFollowUpLabels } from "../shared/request-presentation";
import styles from "./request-filters.module.css";
export function MaintenanceRequestFilters({ criteria, references }: { criteria: RequestSearch; references: RequestReferences }) {
  const filters = useListFilters({ values: { search: criteria.search, status: criteria.status, vehicleId: String(criteria.vehicleId ?? ""), maintenanceTypeId: String(criteria.maintenanceTypeId ?? "") }, defaults: { search: "", status: "", vehicleId: "", maintenanceTypeId: "" }, searchName: "search" });
  return <ListFilterBar pending={filters.isPending} clear={filters.clear}><FormGrid columns={12} className={listFilterGridClassName}>
    <div className={styles.field}><ListSearchField name="search" label="جستجوی درخواست تعمیر" placeholder="شناسه، خودرو، پلاک، نوع تعمیر، اولویت یا شرح مشکل" value={filters.values.search} onChange={filters.changeSearch} /></div>
    <div className={styles.field}><ListSelectField name="status" label="وضعیت رسیدگی" value={filters.values.status} onChange={value => filters.applyFilter("status", value)}><option value="">همهٔ وضعیت‌ها</option>{Object.entries(requestFollowUpLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</ListSelectField></div>
    <ListFilterField className={styles.field}><SearchableSelect key={filters.values.vehicleId} name="request-vehicle-filter" label="خودرو" defaultValue={filters.values.vehicleId} normalizeQuery={normalizePersianSearchText} onValueChange={value => filters.applyFilter("vehicleId", value)} options={[{ value: "", label: "همهٔ خودروها", content: "همهٔ خودروها", searchText: "همه" }, ...references.vehicles.map(vehicle => ({ value: String(vehicle.id), label: `${vehicle.code} — ${vehicle.brandName} ${vehicle.modelName}${vehicle.isActive ? "" : " (غیرفعال)"}`, content: `${vehicle.code} — ${vehicle.brandName} ${vehicle.modelName}${vehicle.isActive ? "" : " (غیرفعال)"}`, searchText: `${vehicle.code} ${vehicle.brandName} ${vehicle.modelName}` }))]} /></ListFilterField>
    <ListFilterField className={styles.field}><SearchableSelect key={filters.values.maintenanceTypeId} name="request-type-filter" label="نوع تعمیر و سرویس" defaultValue={filters.values.maintenanceTypeId} normalizeQuery={normalizePersianSearchText} onValueChange={value => filters.applyFilter("maintenanceTypeId", value)} options={[{ value: "", label: "همهٔ انواع تعمیر و سرویس", content: "همهٔ انواع تعمیر و سرویس", searchText: "همه" }, ...references.types.map(type => ({ value: String(type.id), label: `${type.name} — ${type.code}${type.isActive ? "" : " (غیرفعال)"}`, content: `${type.name} — ${type.code}${type.isActive ? "" : " (غیرفعال)"}`, searchText: `${type.name} ${type.code}` }))]} /></ListFilterField>
  </FormGrid></ListFilterBar>;
}
