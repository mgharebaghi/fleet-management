import type { WorkOrderPart } from "../work-order-parts/work-order-part-records";
import { workPartCosts } from "../work-order-parts/work-part-costs";
import { workTaskCosts } from "../work-order-tasks/work-task-costs";

export type WorkOrderCostGroup = {
  count: number; knownCount: number; missingCount: number;
  knownTotal: string | null; invalid: boolean;
};
export type WorkOrderCostSummary = {
  labor: WorkOrderCostGroup; parts: WorkOrderCostGroup;
  total: string | null; status: "empty" | "incomplete" | "complete" | "invalid";
};

export function workOrderCostSummary(
  tasks: readonly { laborCost: string | null }[],
  items: readonly Pick<WorkOrderPart, "quantity" | "unitPrice" | "totalPrice">[],
): WorkOrderCostSummary {
  const laborCosts = workTaskCosts(tasks), partCosts = workPartCosts(items);
  const missingLabor = tasks.filter(task => task.laborCost === null).length;
  const missingParts = items.filter(item => item.unitPrice === null).length;
  const labor: WorkOrderCostGroup = { count: tasks.length, knownCount: tasks.length - missingLabor, missingCount: missingLabor, knownTotal: laborCosts && tasks.length > missingLabor ? laborCosts.knownTotal : null, invalid: laborCosts === null };
  const parts: WorkOrderCostGroup = { count: items.length, knownCount: items.length - missingParts, missingCount: missingParts, knownTotal: partCosts && items.length > missingParts ? partCosts.knownTotal : null, invalid: partCosts === null };
  if (!laborCosts || !partCosts) return { labor, parts, total: null, status: "invalid" };
  if (tasks.length + items.length === 0) return { labor, parts, total: null, status: "empty" };
  const status = missingLabor + missingParts > 0 ? "incomplete" : "complete";
  if (labor.knownCount + parts.knownCount === 0) return { labor, parts, total: null, status };
  const tenThousandths = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * BigInt(10000) + BigInt(fraction.padEnd(4, "0"));
  };
  const total = tenThousandths(laborCosts.knownTotal) + tenThousandths(partCosts.knownTotal);
  return { labor, parts, total: `${total / BigInt(10000)}.${String(total % BigInt(10000)).padStart(4, "0")}`, status };
}
