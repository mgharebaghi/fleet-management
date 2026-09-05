import type { InternalPlate } from "../vehicle";
export type VehicleIdentifier = "vehicleCode" | "internationalPlateNo" | "vin" | "engineNo" | "chassisNo";
export interface VehicleIdentifierReader {
  identifierExists(identifier: VehicleIdentifier, value: string): Promise<boolean>;
  internalPlateExists(plate: InternalPlate): Promise<boolean>;
}
