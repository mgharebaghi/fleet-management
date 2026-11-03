import type { PartSearch } from "../../../application/parts/part-records";

export type PartListSearchParams = Readonly<Record<string, string | string[] | undefined>>;
const single = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export function parsePartListParams(params: PartListSearchParams): PartSearch {
  const active = single(params.active);
  const requestedPage = Number(single(params.page) ?? 1);
  return {
    search: single(params.search) ?? "",
    active: active === "inactive" || active === "all" ? active : "active",
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1_000_000) : 1,
  };
}

export function partPageHref(params: PartListSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  query.set("page", String(page));
  return `/inventory/parts?${query.toString()}`;
}
