import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MaintenanceCatalogsPage } from "./maintenance-catalogs-page";
import { saveMaintenanceTypeFromCatalogAction } from "../types/save-maintenance-type.action";
import CatalogsRoute from "../../../../app/(admin)/maintenance/catalogs/page";

const { redirect, types, saveType, revalidate } = vi.hoisted(() => ({
  types: vi.fn(),
  saveType: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn((target: string) => { throw new Error(target); }),
}));
vi.mock("next/navigation", async importOriginal => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  redirect,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../../composition/maintenance-reference.factory", () => ({ makeMaintenanceReferences: () => ({ types, saveType }) }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));

describe("maintenance reference data landing page", () => {
  it("renders only the repair and service types card with modal controls", async () => {
    types.mockResolvedValueOnce({ rows: [{ id: 1, code: "SERVICE", name: "Service", isActive: true }], totalCount: 2 });
    types.mockResolvedValueOnce({ rows: [{ id: 2, code: "REPAIR", name: "Repair", isActive: false }], totalCount: 2 });
    const markup = renderToStaticMarkup(await MaintenanceCatalogsPage());
    expect(types).toHaveBeenLastCalledWith({ search: "", active: "all", page: 2 });
    expect(markup).toContain("اطلاعات پایه");
    expect(markup.match(/aria-labelledby="maintenance-catalog-[^"]+"/g)).toEqual([
      'aria-labelledby="maintenance-catalog-types"',
    ]);
    const card = markup.split('aria-labelledby="maintenance-catalog-types"')[1]?.split("</section>")[0];
    expect(card).toContain("انواع تعمیر و سرویس");
    expect(card).toContain("+ افزودن");
    expect(card).toContain("مشاهده همه");
    expect(card).not.toContain('href="/maintenance/catalogs/create"');
    expect(markup).not.toContain('href="/maintenance/catalogs/types"');
    expect(markup).not.toContain('href="/maintenance/workshops');
    expect(markup).not.toContain('href="/maintenance/technicians');
  });

  it("keeps old filtered type-list links working", async () => {
    await expect(CatalogsRoute({ searchParams: Promise.resolve({ active: "all", search: "brake test", page: "2" }) }))
      .rejects.toThrow("/maintenance/catalogs/types?active=all&search=brake+test&page=2");
  });
});

describe("maintenance type creation from the catalog", () => {
  it("uses the existing create rules and refreshes without redirecting", async () => {
    saveType.mockResolvedValueOnce({ success: true, value: { id: 1 } });
    const data = new FormData();
    data.set("code", "SERVICE");
    data.set("name", "Service");
    data.set("description", "");
    await expect(saveMaintenanceTypeFromCatalogAction(null, {}, data)).resolves.toEqual({ saved: true });
    expect(saveType).toHaveBeenLastCalledWith({ id: null, code: "SERVICE", name: "Service", description: "", isActive: true });
    expect(revalidate).toHaveBeenCalledWith("/maintenance/catalogs");
    expect(revalidate).toHaveBeenCalledWith("/maintenance/catalogs/types");
  });

  it("edits the selected type and preserves its deactivation without redirecting", async () => {
    saveType.mockResolvedValueOnce({ success: true, value: { id: 17 } });
    const data = new FormData();
    data.set("code", "REPAIR");
    data.set("name", "Retired type");
    data.set("description", "Legacy");
    data.set("id", "99");
    await expect(saveMaintenanceTypeFromCatalogAction(17, {}, data)).resolves.toEqual({ saved: true });
    expect(saveType).toHaveBeenLastCalledWith({ id: 17, code: "REPAIR", name: "Retired type", description: "Legacy", isActive: false });
    expect(revalidate).toHaveBeenCalledWith("/maintenance/catalogs/17");
    expect(revalidate).toHaveBeenCalledWith("/maintenance/catalogs/17/edit");
  });
});
