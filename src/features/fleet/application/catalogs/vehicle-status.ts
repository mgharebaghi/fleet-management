import type { CatalogEntry } from "./catalog-entry";

// No isActive: unlike the other catalogs, VehicleStatus has no such column.
export type VehicleStatusEntry = CatalogEntry;

export const VEHICLE_STATUS_NAME_MAX_LENGTH = 50;
