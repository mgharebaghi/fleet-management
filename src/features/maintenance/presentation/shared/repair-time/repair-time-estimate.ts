export type RepairTaskTime = { status: string; hours: string | null };
export function repairDurationMilliseconds(tasks: readonly RepairTaskTime[]): number | null {
  const active = tasks.filter(task => task.status !== "Cancelled");
  if (!active.length) return null;
  let hundredths = BigInt(0);
  for (const task of active) {
    if (!["Open", "InProgress", "Completed"].includes(task.status) || task.hours === null || !/^\d{1,8}(\.\d{1,2})?$/.test(task.hours)) return null;
    const [whole, fraction = ""] = task.hours.split(".");
    hundredths += BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  }
  const milliseconds = hundredths * BigInt(36000);
  return milliseconds > BigInt(0) && milliseconds <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(milliseconds) : null;
}
export function repairTimeState(startedAt: string, duration: number, now: number) {
  const start = Date.parse(startedAt), end = start + duration;
  if (!Number.isFinite(start) || !Number.isFinite(end) || Math.abs(end) > 8640000000000000 || !Number.isFinite(now)) return null;
  const elapsed = Math.max(0, now - start);
  return { percent: Math.min(100, elapsed / duration * 100), remaining: Math.max(0, end - now), overdue: now >= end, end };
}
