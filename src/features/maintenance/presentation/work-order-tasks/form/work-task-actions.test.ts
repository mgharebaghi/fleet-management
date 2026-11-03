import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), cancel: vi.fn(), fillCost: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/work-order-task.factory", () => ({ makeWorkOrderTasks: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveWorkTaskAction, cancelWorkTaskAction, fillWorkTaskCostAction } from "./work-task-actions";
function form() { const data = new FormData(); for (const [key, value] of Object.entries({ title: "Task", technicianId: "", laborHours: "99999999.99", laborCost: "9999999999999999.99", status: "Open", description: "", WorkOrderId: "99", CreatedAt: "2000-01-01" })) data.set(key, value); return data; }
beforeEach(() => vi.resetAllMocks());
it("preserves precise transport values, binds the parent on the server and refreshes both tabs", async () => {
  mocks.save.mockResolvedValue({ success: true, id: 3 }); expect(await saveWorkTaskAction(1, null, {}, form())).toEqual({ saved: true });
  expect(mocks.save).toHaveBeenCalledWith(1, { id: null, title: "Task", technicianId: null, laborHours: "99999999.99", laborCost: "9999999999999999.99", status: "Open", description: "" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/work-orders/1/tasks");
});
it("rejects duplicate fields and does not refresh failed commands or leak infrastructure errors", async () => {
  const data = form(); data.append("title", "Duplicate"); expect(await saveWorkTaskAction(1, 3, {}, data)).toEqual({ unavailable: true }); expect(mocks.save).not.toHaveBeenCalled();
  mocks.cancel.mockResolvedValue({ success: false, error: { type: "TASK_NOT_FOUND" } }); expect(await cancelWorkTaskAction(1, 3, {}, form())).toEqual({ error: { type: "TASK_NOT_FOUND" } });
  expect(mocks.revalidate).not.toHaveBeenCalled(); mocks.fillCost.mockRejectedValue(new Error("Private SQL")); expect(await fillWorkTaskCostAction(1, 3, {}, form())).toEqual({ unavailable: true });
});
it("cost completion sends only the one missing amount and cannot overwrite the task", async () => {
  mocks.fillCost.mockResolvedValue({ success: true, id: 3 }); expect(await fillWorkTaskCostAction(1, 3, {}, form())).toEqual({ saved: true });
  expect(mocks.fillCost).toHaveBeenCalledWith(1, 3, "9999999999999999.99"); expect(mocks.save).not.toHaveBeenCalled();
});
