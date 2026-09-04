import type { CatalogEntry } from "./catalog-entry";

export type VehicleModel = {
  id: number;
  name: string;
  isActive: boolean;
  brand: CatalogEntry;
  vehicleType: CatalogEntry | null;
  fuelType: CatalogEntry | null;
};

export type NewVehicleModel = {
  name: string;
  brandId: number;
  vehicleTypeId: number;
  fuelTypeId: number;
};

export const VEHICLE_MODEL_NAME_MAX_LENGTH = 100;
