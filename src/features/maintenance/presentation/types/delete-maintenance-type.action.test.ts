import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ deleteType: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../composition/maintenance-reference.factory", () => ({ makeMaintenanceReferences: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { deleteMaintenanceTypeAction } from "./delete-maintenance-type.action";
beforeEach(() => vi.resetAllMocks());
it("keeps a newly used reference intact and returns a clear message", async () => {
  mocks.deleteType.mockResolvedValue({ success: false, error: { type: "TYPE_IN_USE" } });
  expect((await deleteMaintenanceTypeAction(1, {}, new FormData())).message).toContain("استفاده شده و قابل حذف نیست");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("refreshes list and record views only after successful deletion", async () => {
  mocks.deleteType.mockResolvedValue({ success: true, value: 1 });
  expect(await deleteMaintenanceTypeAction(1, {}, new FormData())).toEqual({ saved: true });
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/catalogs");
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/catalogs/1");
});
it("does not leak persistence failures", async () => {
  mocks.deleteType.mockRejectedValue(new Error("Private SQL detail"));
  expect(await deleteMaintenanceTypeAction(1, {}, new FormData())).toEqual({ message: "حذف نوع تعمیر و سرویس امکان‌پذیر نبود. لطفاً دوباره تلاش کنید." });
});
