import type { VehicleMeterRepository } from "./vehicle-meter-repository";
import type { RecordVehicleMeterInput, RecordVehicleMeterResult, VehicleMeterFailure, VehicleMeterState } from "./vehicle-meter-records";
import { meterHundredths, normalizeMeterValue } from "./vehicle-meter-decimal";
const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2147483647;
export function validateMeterHistory(state: VehicleMeterState): boolean {
  const now = Date.parse(state.now);
  if (!Number.isFinite(now)) return false;
  for (const key of ["odometer", "engineHours"] as const) {
    const current = meterHundredths(state[key]);
    if (state[key] !== null && current === null) return false;
    let previous: bigint | null = null;
    for (const reading of [...state.history].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.id - b.id)) {
      const time = Date.parse(reading.recordedAt);
      if (!Number.isFinite(time) || time > now || (reading.odometer === null && reading.engineHours === null)) return false;
      const value = meterHundredths(reading[key]);
      if (reading[key] !== null && value === null) return false;
      if (value !== null) {
        if (previous !== null && value < previous) return false;
        previous = value;
      }
    }
    if (previous !== null && (current === null || previous > current)) return false;
  }
  return true;
}
export class RecordVehicleMeter {
  constructor(private readonly repository: VehicleMeterRepository) {}
  async execute(input: RecordVehicleMeterInput): Promise<RecordVehicleMeterResult> {
    const value = { ...input, odometer: normalizeMeterValue(input.odometer), engineHours: normalizeMeterValue(input.engineHours), description: input.description?.trim() || null };
    const fields: Extract<VehicleMeterFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (!validId(input.vehicleId)) fields.vehicleId = "INVALID";
    if (!value.recordedAt || !Number.isFinite(value.recordedAt.getTime()) || value.recordedAt.getUTCFullYear() < 1 || value.recordedAt.getUTCFullYear() > 9999) return { success: false, error: { type: "INVALID_RECORDED_AT" } };
    if (value.odometer === null && value.engineHours === null) return { success: false, error: { type: "METRIC_REQUIRED" } };
    for (const key of ["odometer", "engineHours"] as const) if (value[key] !== null && meterHundredths(value[key]) === null) fields[key] = "INVALID";
    if ((value.description?.length ?? 0) > 500) fields.description = "TOO_LONG";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(input.vehicleId, async session => {
      const state = await session.snapshot();
      if (!state) return { success: false, error: { type: "NOT_FOUND" } };
      if (!validateMeterHistory(state)) return { success: false, error: { type: "HISTORY_INVALID" } };
      const time = value.recordedAt!.getTime();
      if (time > Date.parse(state.now)) return { success: false, error: { type: "FUTURE_READING" } };
      const current = { odometer: state.odometer, engineHours: state.engineHours };
      const sorted = [...state.history].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.id - b.id);
      for (const key of ["odometer", "engineHours"] as const) {
        const amount = meterHundredths(value[key]);
        if (amount === null) continue;
        const before = sorted.filter(reading => reading[key] !== null && Date.parse(reading.recordedAt) <= time).at(-1);
        const after = sorted.find(reading => reading[key] !== null && Date.parse(reading.recordedAt) > time);
        const previous = meterHundredths(before?.[key] ?? null);
        const next = meterHundredths(after?.[key] ?? null);
        const latest = meterHundredths(state[key]);
        if ((previous !== null && amount < previous) || (!after && latest !== null && amount < latest)) fields[key] = "DECREASE";
        if (next !== null && amount > next) fields[key] = "AFTER_NEXT";
        if (!after) current[key] = value[key];
      }
      if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
      const id = await session.append({ recordedAt: value.recordedAt!, odometer: value.odometer, engineHours: value.engineHours, description: value.description });
      await session.updateCurrent(current);
      return { success: true, id };
    });
  }
}