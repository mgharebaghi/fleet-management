export type VehicleDispatchFailure = "VEHICLE_UNDER_REPAIR" | "VEHICLE_REPAIR_STATE_UNKNOWN" | "VEHICLE_DISPATCH_CHANGED";
export type VehicleDispatchCheck = { available: true } | { available: false; reason: VehicleDispatchFailure };
export interface VehicleDispatchReadiness {
  check(vehicleIds: readonly number[]): Promise<VehicleDispatchCheck>;
}
