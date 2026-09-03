import type { CatalogEntry } from "./catalog-entry";

export type VehicleType = CatalogEntry & {
  isActive: boolean;
};

export const VEHICLE_TYPE_NAME_MAX_LENGTH = 100;
