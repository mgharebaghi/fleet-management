import { workTaskStatuses } from "../work-order-tasks/work-order-task-records";
import { workOrderStatuses } from "./work-order-records";
import type { WorkOrderRepository } from "./work-order-repository";
import type { CompleteWorkOrderInput, CompletionReading, WorkOrderCompletionResult } from "./work-order-completion-records";
import { completionMeterValue, validCompletionReading } from "./completion-meter-reading";
export type WorkOrderCompletionRepository = Pick<WorkOrderRepository, "get" | "atomic"> & { readings(vehicleId: number): Promise<CompletionReading[]> };
export class CompleteWorkOrder {
  constructor(private readonly repository: WorkOrderCompletionRepository) {}
  async references(id: number) {
    const order = await this.repository.get(id);
    return order?.origin === "Plan" ? this.repository.readings(order.vehicle.id) : [];
  }
  async execute(input: CompleteWorkOrderInput): Promise<WorkOrderCompletionResult> {
    const fail = (error: Exclude<WorkOrderCompletionResult, { success: true }>["error"]): WorkOrderCompletionResult => ({ success: false, error });
    if (!Number.isInteger(input.id) || input.id <= 0 || input.id > 2147483647) return fail("INVALID_ID");
    const result = input.result.trim();
    if (!result) return fail("RESULT_REQUIRED");
    if (result.length > 1000) return fail("RESULT_TOO_LONG");
    if (input.readingId !== null && (!Number.isInteger(input.readingId) || input.readingId <= 0 || input.readingId > 2147483647)) return fail("INVALID_READING");
    const previous = await this.repository.get(input.id);
    if (!previous) return fail("NOT_FOUND");
    return this.repository.atomic({ vehicleId: previous.vehicle.id, orderId: input.id, ...(previous.planId !== null ? { planId: previous.planId } : {}) }, async session => {
      const order = await session.order(input.id);
      if (!order) return fail("NOT_FOUND");
      if (order.vehicle.id !== previous.vehicle.id || order.planId !== previous.planId || order.origin === "Unknown" || !workOrderStatuses.some(status => status === order.status)) return fail("UNKNOWN_STATE");
      if (order.status === "Completed" || order.status === "Cancelled") return fail("ORDER_CLOSED");
      if (order.status !== "InProgress") return fail("ORDER_NOT_STARTED");
      if (!order.startedAt || !Number.isFinite(Date.parse(order.startedAt)) || order.endedAt !== null) return fail("UNKNOWN_STATE");
      const tasks = await session.taskStates(input.id);
      if (tasks.some(task => !workTaskStatuses.some(status => status === task.status))) return fail("UNKNOWN_STATE");
      if (tasks.some(task => task.status === "Open" || task.status === "InProgress")) return fail("UNFINISHED_TASKS");
      if (!tasks.some(task => task.status === "Completed")) return fail("NO_COMPLETED_TASK");
      const context = await session.completionContext(order.vehicle.id, order.planId);
      if (!Number.isFinite(Date.parse(context.now)) || Date.parse(context.now) < Date.parse(order.startedAt)) return fail("INVALID_END_TIME");
      let planBaseline = null;
      if (order.origin === "Plan") {
        const plan = context.plan;
        if (!plan || plan.id !== order.planId || plan.vehicleId !== order.vehicle.id || plan.typeId !== order.type.id) return fail("UNKNOWN_STATE");
        const reading = input.readingId === null ? null : validCompletionReading(context.readings, input.readingId, context.now);
        if (input.readingId !== null && !reading) return fail("INVALID_READING");
        if ((plan.needsOdometer && reading?.odometer == null) || (plan.needsEngineHours && reading?.engineHours == null)) return fail("PLAN_READING_REQUIRED");
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(context.now));
        const datePart = (name: string) => parts.find(part => part.type === name)!.value;
        const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
        if (plan.lastDate && plan.lastDate > today) return fail("PLAN_BASELINE_NEWER");
        for (const [value, baseline] of [[reading?.odometer ?? null, plan.lastOdometer], [reading?.engineHours ?? null, plan.lastEngineHours]] as const) {
          const current = completionMeterValue(value), last = completionMeterValue(baseline);
          if (baseline !== null && last === null) return fail("UNKNOWN_STATE");
          if (current !== null && last !== null && current < last) return fail("PLAN_BASELINE_NEWER");
        }
        planBaseline = { id: plan.id, odometer: reading?.odometer ?? null, engineHours: reading?.engineHours ?? null };
      } else if (input.readingId !== null) return fail("INVALID_READING");
      await session.completeOrder(input.id, { result, endedAt: context.now, planBaseline });
      return { success: true, id: input.id };
    });
  }
}
