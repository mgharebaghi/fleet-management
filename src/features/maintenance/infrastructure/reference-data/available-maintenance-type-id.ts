export function availableMaintenanceTypeId(used: ReadonlySet<number>): number | null {
  for (let id = 1; id <= 255; id++) if (!used.has(id)) return id;
  return null;
}
