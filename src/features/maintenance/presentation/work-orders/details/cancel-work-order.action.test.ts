import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/work-order.factory", () => ({ makeCancelWorkOrder: () => ({ execute: mocks.execute }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { cancelWorkOrderAction } from "./cancel-work-order.action";
beforeEach(() => vi.resetAllMocks());
it("uses the bound parent id and refreshes file, tasks and linked requests only after success", async () => {
  mocks.execute.mockResolvedValue({ success: true }); const data = new FormData(); data.set("reason", "Stop"); data.set("id", "999");
  expect(await cancelWorkOrderAction(7, {}, data)).toEqual({ saved: true });
  expect(mocks.execute).toHaveBeenCalledWith(7, "Stop"); expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/work-orders/7/tasks");
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/requests/[requestId]", "page");
});
it("does not guess missing or multiply submitted reasons", async () => {
  const data = new FormData(); expect(await cancelWorkOrderAction(7, {}, data)).toEqual({ error: "UNAVAILABLE" });
  data.append("reason", "A"); data.append("reason", "B"); expect(await cancelWorkOrderAction(7, {}, data)).toEqual({ error: "UNAVAILABLE" });
  expect(mocks.execute).not.toHaveBeenCalled();
});
it("returns business failures and hides infrastructure details without revalidation", async () => {
  const data = new FormData(); data.set("reason", " "); mocks.execute.mockResolvedValue({ success: false, error: "REASON_REQUIRED" });
  expect(await cancelWorkOrderAction(7, {}, data)).toEqual({ error: "REASON_REQUIRED" });
  mocks.execute.mockRejectedValue(new Error("Synthetic failure")); expect(await cancelWorkOrderAction(7, {}, data)).toEqual({ error: "UNAVAILABLE" });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
