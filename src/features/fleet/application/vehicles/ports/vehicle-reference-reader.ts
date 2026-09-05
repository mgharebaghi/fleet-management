export interface VehicleReferenceReader {
  modelExists(modelId: number): Promise<boolean>;
  statusExists(vehicleStatusId: number): Promise<boolean>;
}
