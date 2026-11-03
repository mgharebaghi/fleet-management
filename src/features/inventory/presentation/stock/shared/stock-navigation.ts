import type { StockSearch } from "../../../application/stock/stock-records";
import { normalizeStockSearch } from "../../../application/stock/manage-stock";
export type StockSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export function stockSearch(params: StockSearchParams): StockSearch {
  const single = (key: string) => { const value = params[key]; return (Array.isArray(value) ? value[0] : value) ?? ""; };
  const id = (key: string) => /^\d+$/.test(single(key)) ? Number(single(key)) : null;
  return normalizeStockSearch({ search: single("search"), warehouseId: id("warehouseId"), partId: id("partId"), type: single("type"), from: single("from"), to: single("to"), page: Number(single("page") || 1) });
}
export function stockPageHref(path: string, params: StockSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) if (value !== undefined) for (const entry of Array.isArray(value) ? value : [value]) query.append(name, entry);
  query.set("page", String(page)); return `${path}?${query}`;
}
