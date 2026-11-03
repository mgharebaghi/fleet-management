export type VehicleMeterReading = { id: number; recordedAt: string; odometer: string | null; engineHours: string | null; description: string | null };
export type VehicleMeterState = { odometer: string | null; engineHours: string | null; now: string; history: VehicleMeterReading[] };
export type RecordVehicleMeterInput = { vehicleId: number; recordedAt: Date | null; odometer: string | null; engineHours: string | null; description: string | null };
export type VehicleMeterSearch = { search: string; page: number };
export type VehicleMeterFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<"vehicleId" | "recordedAt" | "odometer" | "engineHours" | "description", "REQUIRED" | "INVALID" | "TOO_LONG" | "FUTURE" | "DECREASE" | "AFTER_NEXT">> } | { type: "NOT_FOUND" | "HISTORY_INVALID" | "METRIC_REQUIRED" | "INVALID_RECORDED_AT" | "FUTURE_READING" };
export type RecordVehicleMeterResult = { success: true; id: number } | { success: false; error: VehicleMeterFailure };
export type PreparedVehicleMeter = { recordedAt: Date; odometer: string | null; engineHours: string | null; description: string | null };
