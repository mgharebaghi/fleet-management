import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/work-order.factory", () => ({ makeCompleteWorkOrder: () => ({ execute: mocks.execute }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { completeWorkOrderAction } from "./complete-work-order.action";
beforeEach(() => vi.resetAllMocks());
const data = () => { const form = new FormData(); form.set("result", "Done"); form.set("readingId", ""); return form; };
it("binds the file identity and ignores client time, status and vehicle values", async () => {
  mocks.execute.mockResolvedValue({ success: true, id: 3 }); const form = data(); form.set("id", "99"); form.set("endedAt", "2000-01-01"); form.set("status", "Open");
  expect(await completeWorkOrderAction(3, {}, form)).toEqual({ saved: true });
  expect(mocks.execute).toHaveBeenCalledWith({ id: 3, result: "Done", readingId: null });
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/requests/[requestId]", "page"); expect(mocks.revalidate).toHaveBeenCalledWith("/trips/[tripRequestId]", "page");
});
it("rejects duplicate or malformed transport and exposes no infrastructure details", async () => {
  const form = data(); form.append("result", "Duplicate"); expect(await completeWorkOrderAction(3, {}, form)).toEqual({ error: "UNAVAILABLE" });
  const malformed = data(); malformed.set("readingId", "-1"); expect(await completeWorkOrderAction(3, {}, malformed)).toEqual({ error: "INVALID_READING" }); expect(mocks.execute).not.toHaveBeenCalled();
  mocks.execute.mockRejectedValue(new Error("Private database details")); expect(await completeWorkOrderAction(3, {}, data())).toEqual({ error: "UNAVAILABLE" }); expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("returns unresolved tasks without refreshing or resubmitting", async () => {
  mocks.execute.mockResolvedValue({ success: false, error: "UNFINISHED_TASKS" }); const form = data(); form.set("readingId", "12");
  expect(await completeWorkOrderAction(3, {}, form)).toEqual({ error: "UNFINISHED_TASKS" }); expect(mocks.execute).toHaveBeenCalledTimes(1); expect(mocks.revalidate).not.toHaveBeenCalled();
});
