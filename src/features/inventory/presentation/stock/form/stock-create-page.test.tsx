import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StockReferences } from "../../../application/stock/stock-records";

const mocks = vi.hoisted(() => ({ references: vi.fn() }));
vi.mock("../../../composition/stock.factory", () => ({ makeManageStock: () => mocks }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>, useLinkStatus: () => ({ pending: false }) }));
vi.mock("./stock-form", () => ({ StockForm: ({ warehouseId, partId }: { warehouseId: string; partId: string }) => <form data-stock-form data-warehouse={warehouseId} data-part={partId} /> }));
import { StockCreatePage } from "./stock-create-page";

const warehouse = { id: 1, code: "W1", name: "Warehouse", active: true };
const part = { id: 2, code: "P1", name: "Part", unitName: "Item", active: true };
async function markup(references: StockReferences) {
  mocks.references.mockResolvedValue(references);
  return renderToStaticMarkup(await StockCreatePage({ searchParams: { warehouseId: "1", partId: "2" } }));
}
beforeEach(() => vi.resetAllMocks());
describe("stock creation prerequisites", () => {
  it("directs an empty inventory to both creation routes, rather than catalogs", async () => {
    const html = await markup({ warehouses: [], parts: [] });
    expect(html).toContain('href="/inventory/warehouses/create"');
    expect(html).toContain('href="/inventory/parts/create"');
    expect(html).not.toContain('href="/inventory/catalogs"');
    expect(html).not.toContain("data-stock-form");
  });
  it("requests only the missing warehouse when a usable part exists", async () => {
    const html = await markup({ warehouses: [], parts: [part] });
    expect(html).toContain("برای ثبت گردش، انبار فعال لازم است");
    expect(html).toContain('href="/inventory/warehouses/create"');
    expect(html).not.toContain('href="/inventory/parts/create"');
  });
  it("requests only the missing part when a usable warehouse exists", async () => {
    const html = await markup({ warehouses: [warehouse], parts: [] });
    expect(html).toContain("برای ثبت گردش، قطعهٔ فعال لازم است");
    expect(html).toContain('href="/inventory/parts/create"');
    expect(html).not.toContain('href="/inventory/warehouses/create"');
  });
  it("offers existing inactive records for reactivation instead of asking users to recreate them", async () => {
    const html = await markup({ warehouses: [{ ...warehouse, active: false }], parts: [{ ...part, active: false }] });
    expect(html).toContain('href="/inventory/warehouses?active=all"');
    expect(html).toContain('href="/inventory/parts?active=all"');
    expect(html).toContain("انبارهای موجود غیرفعال‌اند");
    expect(html).toContain("قطعات موجود غیرفعال‌اند");
    expect(html).not.toContain("data-stock-form");
  });
  it("opens the prefilled form when each reference has an active choice", async () => {
    const html = await markup({ warehouses: [{ ...warehouse, id: 3, active: false }, warehouse], parts: [part] });
    expect(html).toContain("data-stock-form");
    expect(html).toContain('data-warehouse="1"');
    expect(html).toContain('data-part="2"');
    expect(html).not.toContain("مدیریت انبارها");
  });
  it("reports failed reads as errors, without pretending prerequisites are missing", async () => {
    mocks.references.mockRejectedValue(new Error("Synthetic unavailable database"));
    const html = renderToStaticMarkup(await StockCreatePage({ searchParams: {} }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("دریافت اطلاعات انبار و قطعات امکان‌پذیر نبود");
    expect(html).not.toContain('href="/inventory/parts/create"');
  });
});
