import { describe, expect, it } from "vitest";

import type { VehicleModelReferenceReader } from "../ports/vehicle-model-reference-reader";
import type { VehicleModelWriter } from "../ports/vehicle-model-writer";
import type { NewVehicleModel, VehicleModel } from "../vehicle-model";
import { CreateVehicleModel } from "./create-vehicle-model";

const VEHICLE_MODEL: VehicleModel = {
  id: 10,
  name: "FH",
  isActive: true,
  brand: { id: 1, name: "Volvo" },
  vehicleType: { id: 2, name: "Truck" },
  fuelType: { id: 3, name: "Diesel" },
};

class VehicleModelWriterFake implements VehicleModelWriter {
  readonly createdVehicleModels: NewVehicleModel[] = [];

  async create(input: NewVehicleModel): Promise<VehicleModel> {
    this.createdVehicleModels.push(input);
    return VEHICLE_MODEL;
  }
}

class VehicleModelReferenceReaderFake
  implements VehicleModelReferenceReader
{
  readonly existingBrandIds = new Set([1]);
  readonly existingVehicleTypeIds = new Set([2]);
  readonly existingFuelTypeIds = new Set([3]);
  readonly checkedBrandIds: number[] = [];
  readonly checkedVehicleTypeIds: number[] = [];
  readonly checkedFuelTypeIds: number[] = [];

  async brandExists(brandId: number): Promise<boolean> {
    this.checkedBrandIds.push(brandId);
    return this.existingBrandIds.has(brandId);
  }

  async vehicleTypeExists(vehicleTypeId: number): Promise<boolean> {
    this.checkedVehicleTypeIds.push(vehicleTypeId);
    return this.existingVehicleTypeIds.has(vehicleTypeId);
  }

  async fuelTypeExists(fuelTypeId: number): Promise<boolean> {
    this.checkedFuelTypeIds.push(fuelTypeId);
    return this.existingFuelTypeIds.has(fuelTypeId);
  }
}

function createValidInput() {
  return {
    name: "FH",
    brandId: 1,
    vehicleTypeId: 2,
    fuelTypeId: 3,
  };
}

describe("CreateVehicleModel", () => {
  it("rejects a whitespace-only name before calling dependencies", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    const result = await createVehicleModel.execute({
      ...createValidInput(),
      name: "   ",
    });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["REQUIRED"] } },
    });
    expect(referenceReader.checkedBrandIds).toEqual([]);
    expect(referenceReader.checkedVehicleTypeIds).toEqual([]);
    expect(referenceReader.checkedFuelTypeIds).toEqual([]);
    expect(writer.createdVehicleModels).toEqual([]);
  });

  it("rejects a name longer than 100 characters before calling dependencies", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    const result = await createVehicleModel.execute({
      ...createValidInput(),
      name: "a".repeat(101),
    });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["TOO_LONG"] } },
    });
    expect(referenceReader.checkedBrandIds).toEqual([]);
    expect(referenceReader.checkedVehicleTypeIds).toEqual([]);
    expect(referenceReader.checkedFuelTypeIds).toEqual([]);
    expect(writer.createdVehicleModels).toEqual([]);
  });

  it("returns BRAND_NOT_FOUND and stops checking references when the brand does not exist", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    referenceReader.existingBrandIds.clear();
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    const result = await createVehicleModel.execute(createValidInput());

    expect(result).toEqual({
      success: false,
      error: { type: "BRAND_NOT_FOUND" },
    });
    expect(referenceReader.checkedBrandIds).toEqual([1]);
    expect(referenceReader.checkedVehicleTypeIds).toEqual([]);
    expect(referenceReader.checkedFuelTypeIds).toEqual([]);
    expect(writer.createdVehicleModels).toEqual([]);
  });

  it("returns VEHICLE_TYPE_NOT_FOUND without checking fuel or creating when the vehicle type does not exist", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    referenceReader.existingVehicleTypeIds.clear();
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    const result = await createVehicleModel.execute(createValidInput());

    expect(result).toEqual({
      success: false,
      error: { type: "VEHICLE_TYPE_NOT_FOUND" },
    });
    expect(referenceReader.checkedBrandIds).toEqual([1]);
    expect(referenceReader.checkedVehicleTypeIds).toEqual([2]);
    expect(referenceReader.checkedFuelTypeIds).toEqual([]);
    expect(writer.createdVehicleModels).toEqual([]);
  });

  it("returns FUEL_TYPE_NOT_FOUND without creating when the fuel type does not exist", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    referenceReader.existingFuelTypeIds.clear();
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    const result = await createVehicleModel.execute(createValidInput());

    expect(result).toEqual({
      success: false,
      error: { type: "FUEL_TYPE_NOT_FOUND" },
    });
    expect(referenceReader.checkedBrandIds).toEqual([1]);
    expect(referenceReader.checkedVehicleTypeIds).toEqual([2]);
    expect(referenceReader.checkedFuelTypeIds).toEqual([3]);
    expect(writer.createdVehicleModels).toEqual([]);
  });

  it("passes the normalized input to the writer and returns its vehicle model", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    const result = await createVehicleModel.execute({
      ...createValidInput(),
      name: "  FH  ",
    });

    expect(writer.createdVehicleModels).toEqual([
      {
        name: "FH",
        brandId: 1,
        vehicleTypeId: 2,
        fuelTypeId: 3,
      },
    ]);
    expect(result).toEqual({ success: true, vehicleModel: VEHICLE_MODEL });
  });

  it("propagates an unexpected dependency error", async () => {
    const writer = new VehicleModelWriterFake();
    const unexpectedError = new Error("reference lookup failed");
    const referenceReader = new VehicleModelReferenceReaderFake();
    referenceReader.brandExists = async () => {
      throw unexpectedError;
    };
    const createVehicleModel = new CreateVehicleModel(writer, referenceReader);

    await expect(createVehicleModel.execute(createValidInput())).rejects.toBe(
      unexpectedError,
    );
    expect(writer.createdVehicleModels).toEqual([]);
  });
});
