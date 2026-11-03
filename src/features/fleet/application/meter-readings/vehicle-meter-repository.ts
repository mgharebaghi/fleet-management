import type { PreparedVehicleMeter, VehicleMeterSearch, VehicleMeterState, VehicleMeterReading } from "./vehicle-meter-records";
export interface VehicleMeterWriteSession {
  snapshot(): Promise<VehicleMeterState | null>;
  append(value: PreparedVehicleMeter): Promise<number>;
  updateCurrent(value: { odometer: string | null; engineHours: string | null }): Promise<void>;
}
export interface VehicleMeterRepository {
  atomic<T>(vehicleId: number, work: (session: VehicleMeterWriteSession) => Promise<T>): Promise<T>;
  list(vehicleId: number, search: VehicleMeterSearch): Promise<{ rows: VehicleMeterReading[]; totalCount: number }>;
}
