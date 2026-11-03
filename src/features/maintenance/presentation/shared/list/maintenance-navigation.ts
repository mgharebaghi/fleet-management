import { normalizeReferenceSearch } from "../../../application/reference-data/manage-maintenance-references";
export type MaintenanceSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export function maintenanceSearch(params: MaintenanceSearchParams) {
  const value = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]) ?? "";
  return normalizeReferenceSearch({ search: value("search"), active: value("active") as "active", page: Number(value("page") || 1) });
}
export function maintenancePageHref(path: string, params: MaintenanceSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  query.set("page", String(page)); return `${path}?${query}`;
}
