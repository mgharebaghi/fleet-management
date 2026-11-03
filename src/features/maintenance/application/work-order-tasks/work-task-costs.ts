export function workTaskCosts(tasks: readonly { laborCost: string | null }[]): { knownTotal: string; missingCount: number } | null {
  let total = BigInt(0), missingCount = 0;
  for (const task of tasks) {
    if (task.laborCost === null) { missingCount++; continue; }
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(task.laborCost)) return null;
    const [whole, fraction = ""] = task.laborCost.split(".");
    total += BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  }
  return { knownTotal: `${total / BigInt(100)}.${String(total % BigInt(100)).padStart(2, "0")}`, missingCount };
}
