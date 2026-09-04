import { describe, expect, it } from "vitest";

import type { VehicleModelReader } from "../ports/vehicle-model-reader";
import type { VehicleModel } from "../vehicle-model";
import { ListVehicleModels } from "./list-vehicle-models";

class VehicleModelReaderFake implements VehicleModelReader {
  callCount = 0;

  constructor(private readonly vehicleModels: VehicleModel[]) {}

  async list(): Promise<VehicleModel[]> {
    this.callCount += 1;
    return this.vehicleModels;
  }
}

describe("ListVehicleModels", () => {
  it("calls the reader once and returns its application models unchanged", async () => {
    const vehicleModels: VehicleModel[] = [
      {
        id: 10,
        name: "FH",
        isActive: true,
        brand: { id: 1, name: "Volvo" },
        vehicleType: { id: 2, name: "Truck" },
        fuelType: { id: 3, name: "Diesel" },
      },
    ];
    const reader = new VehicleModelReaderFake(vehicleModels);
    const listVehicleModels = new ListVehicleModels(reader);

    const result = await listVehicleModels.execute();

    expect(reader.callCount).toBe(1);
    expect(result).toBe(vehicleModels);
  });
});
