import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendStockAction } from "./append-stock.action";
const mocks = vi.hoisted(() => ({ append: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../../composition/stock.factory", () => ({ makeManageStock: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
const form = () => { const data = new FormData(); for (const [name, value] of Object.entries({ warehouseId: "1", partId: "2", type: "Receipt", quantity: "9999999999999999.99", unitPrice: "12.34", description: "Note" })) data.set(name, value); return data; };
beforeEach(() => { vi.resetAllMocks(); mocks.append.mockResolvedValue({ success: false, error: { type: "INSUFFICIENT_STOCK" } }); });
describe("stock action transport", () => {
  it("preserves decimal text and ignores forged database-managed values", async () => {
    const data = form(); data.set("TransactionDate", "1900-01-01"); data.set("StockTransactionId", "999");
    await appendStockAction({}, data);
    expect(mocks.append).toHaveBeenCalledWith({ warehouseId: 1, partId: 2, type: "Receipt", quantity: "9999999999999999.99", unitPrice: "12.34", description: "Note" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects duplicate fields and file payloads before reaching Application", async () => {
    const duplicate = form(); duplicate.append("quantity", "1");
    expect(await appendStockAction({}, duplicate)).toEqual({ unavailable: true });
    const file = form(); file.set("quantity", new File(["x"], "quantity.txt"));
    expect(await appendStockAction({}, file)).toEqual({ unavailable: true });
    expect(mocks.append).not.toHaveBeenCalled();
  });
  it("retains the submitted money value after a business failure", async () => {
    expect(await appendStockAction({}, form())).toMatchObject({ error: { type: "INSUFFICIENT_STOCK" }, values: { unitPrice: "12.34" } });
  });
  it("does not expose infrastructure errors or automatically retry unknown outcomes", async () => {
    mocks.append.mockRejectedValue(new Error("Synthetic driver secret"));
    expect(await appendStockAction({}, form())).toMatchObject({ unavailable: true, values: { unitPrice: "12.34" } });
    expect(mocks.append).toHaveBeenCalledTimes(1);
  });
  it("redirects only after success, carrying bigint IDs as strings", async () => {
    mocks.append.mockResolvedValue({ success: true, id: "9007199254740993" });
    mocks.redirect.mockImplementation(() => { throw new Error("Redirect"); });
    await expect(appendStockAction({}, form())).rejects.toThrow("Redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/inventory/movements?partId=2&warehouseId=1&recorded=9007199254740993");
    expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/stock");
    expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/parts/2");
  });
});
