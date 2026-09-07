import type { InternalPlate } from "../vehicle";
export type VehicleIdentifier = "vehicleCode" | "internationalPlateNo" | "vin" | "engineNo" | "chassisNo";
export interface VehicleIdentifierReader {
  identifierExists(identifier: VehicleIdentifier, value: string, excludeVehicleId?: number): Promise<boolean>;
  internalPlateExists(plate: InternalPlate, excludeVehicleId?: number): Promise<boolean>;
}
