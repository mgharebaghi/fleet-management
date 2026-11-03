import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), delete: vi.fn(), fillPrice: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/work-order-part.factory", () => ({ makeWorkOrderParts: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveWorkPartAction, deleteWorkPartAction, fillWorkPartPriceAction } from "./work-part-actions";
const form = () => { const data = new FormData(); for (const [name, value] of Object.entries({ partId: "2", taskId: "", quantity: "9999999999999999.99", unitPrice: "2.03", description: "Note", TotalPrice: "0", WorkOrderId: "99", CreatedAt: "2000-01-01" })) data.set(name, value); return data; };
beforeEach(() => vi.resetAllMocks());
it("binds parent/line identifiers and ignores computed, managed and forged fields", async () => {
  mocks.save.mockResolvedValue({ success: true, id: 3 }); expect(await saveWorkPartAction(1, null, {}, form())).toEqual({ saved: true });
  expect(mocks.save).toHaveBeenCalledWith(1, { id: null, partId: 2, taskId: null, quantity: "9999999999999999.99", unitPrice: "2.03", description: "Note" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/work-orders/1/parts");
  expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/parts/[partId]", "page");
});
it("rejects duplicate fields and does not revalidate failures or expose technical errors", async () => {
  const data = form(); data.append("quantity", "1"); expect(await saveWorkPartAction(1, 3, {}, data)).toEqual({ unavailable: true }); expect(mocks.save).not.toHaveBeenCalled();
  mocks.delete.mockResolvedValue({ success: false, error: { type: "ORDER_CLOSED" } }); expect(await deleteWorkPartAction(1, 3, {}, form())).toEqual({ error: { type: "ORDER_CLOSED" } });
  mocks.fillPrice.mockRejectedValue(new Error("Private persistence")); expect(await fillWorkPartPriceAction(1, 3, {}, form())).toEqual({ unavailable: true }); expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("transports only the missing price on a closed file", async () => {
  mocks.fillPrice.mockResolvedValue({ success: true, id: 3 }); expect(await fillWorkPartPriceAction(1, 3, {}, form())).toEqual({ saved: true });
  expect(mocks.fillPrice).toHaveBeenCalledWith(1, 3, "2.03"); expect(mocks.save).not.toHaveBeenCalled();
});
