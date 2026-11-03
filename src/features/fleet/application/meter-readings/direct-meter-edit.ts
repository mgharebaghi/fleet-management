import { sameMeterValue } from "./vehicle-meter-decimal";
export class VehicleMeterHistoryError extends Error {
  constructor() { super("Vehicle meter history prevents direct meter changes."); this.name = "VehicleMeterHistoryError"; }
}
export function guardDirectMeterEdit(current: { odometer: string | null; engineHours: string | null }, proposed: { odometer: string | null; engineHours: string | null }, hasHistory: boolean): void {
  if (hasHistory && (!sameMeterValue(current.odometer, proposed.odometer) || !sameMeterValue(current.engineHours, proposed.engineHours))) throw new VehicleMeterHistoryError();
}
