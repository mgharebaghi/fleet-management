export interface VehicleModelReferenceReader {
  brandExists(brandId: number): Promise<boolean>;
  vehicleTypeExists(vehicleTypeId: number): Promise<boolean>;
  fuelTypeExists(fuelTypeId: number): Promise<boolean>;
}
