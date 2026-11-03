import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ deleteWarehouse: vi.fn(), setWarehouseActive: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/inventory-reference.factory", () => ({ makeManageInventoryReferences: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { deleteWarehouseAction, setWarehouseActiveAction } from "./warehouse-row.action";

beforeEach(() => vi.resetAllMocks());
describe("warehouse row actions", () => {
  it("reports used warehouses without refreshing or deleting their history", async () => {
    mocks.deleteWarehouse.mockResolvedValue({ success: false, error: { type: "WAREHOUSE_IN_USE" } });
    expect(await deleteWarehouseAction(3, {}, new FormData())).toEqual({ message: "این انبار سابقهٔ گردش دارد و قابل حذف نیست؛ در صورت نیاز آن را غیرفعال کنید." });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("refreshes stock forms and warehouse views after successful operations", async () => {
    mocks.deleteWarehouse.mockResolvedValue({ success: true, value: 3 });
    expect(await deleteWarehouseAction(3, {}, new FormData())).toEqual({ saved: true });
    expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/stock");
    mocks.setWarehouseActive.mockResolvedValue({ success: true, value: { id: 3, isActive: false } });
    expect(await setWarehouseActiveAction(3, false, {}, new FormData())).toEqual({ saved: true });
    expect(mocks.setWarehouseActive).toHaveBeenCalledWith(3, false);
    expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/movements/create");
  });
  it("keeps persistence errors out of the UI and reports missing warehouses", async () => {
    mocks.deleteWarehouse.mockRejectedValue(new Error("Internal database failure"));
    expect(await deleteWarehouseAction(3, {}, new FormData())).toEqual({ message: "حذف انبار امکان‌پذیر نبود. لطفاً دوباره تلاش کنید." });
    mocks.setWarehouseActive.mockResolvedValue({ success: false, error: { type: "NOT_FOUND" } });
    expect(await setWarehouseActiveAction(3, true, {}, new FormData())).toEqual({ message: "انبار پیدا نشد یا درخواست معتبر نیست. فهرست را به‌روزرسانی کنید." });
  });
});
