import type { CatalogEntry } from "./catalog-entry";

export type FuelType = CatalogEntry & {
  isActive: boolean;
};

export const FUEL_TYPE_NAME_MAX_LENGTH = 50;
