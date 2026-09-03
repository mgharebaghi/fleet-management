import type { CatalogEntry } from "./catalog-entry";

export type VehicleBrand = CatalogEntry & {
  isActive: boolean;
};

export const VEHICLE_BRAND_NAME_MAX_LENGTH = 100;
