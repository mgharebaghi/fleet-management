import { describe, expect, it } from "vitest";

import { CatalogEntryNotFoundError } from "../ports/catalog-entry-writer";
import type { VehicleModelReferenceReader } from "../ports/vehicle-model-reference-reader";
import type {
  UpdateVehicleModelChanges,
  VehicleModelWriter,
} from "../ports/vehicle-model-writer";
import type { VehicleModel } from "../vehicle-model";
import { UpdateVehicleModel } from "./update-vehicle-model";

const VEHICLE_MODEL: VehicleModel = {
  id: 10,
  name: "FH",
  isActive: true,
  brand: { id: 1, name: "Volvo" },
  vehicleType: { id: 2, name: "Truck" },
  fuelType: { id: 3, name: "Diesel" },
};

class VehicleModelWriterFake implements VehicleModelWriter {
  readonly updates: { id: number; changes: UpdateVehicleModelChanges }[] = [];
  missingId: number | null = null;

  async create(): Promise<VehicleModel> {
    return VEHICLE_MODEL;
  }

  async update(
    id: number,
    changes: UpdateVehicleModelChanges,
  ): Promise<VehicleModel> {
    this.updates.push({ id, changes });
    if (id === this.missingId) {
      throw new CatalogEntryNotFoundError();
    }
    return { ...VEHICLE_MODEL, id, name: changes.name, isActive: changes.isActive };
  }

  async remove(): Promise<void> {}
}

class VehicleModelReferenceReaderFake
  implements VehicleModelReferenceReader
{
  readonly existingBrandIds = new Set([1]);
  readonly existingVehicleTypeIds = new Set([2]);
  readonly existingFuelTypeIds = new Set([3]);

  async brandExists(brandId: number): Promise<boolean> {
    return this.existingBrandIds.has(brandId);
  }

  async vehicleTypeExists(vehicleTypeId: number): Promise<boolean> {
    return this.existingVehicleTypeIds.has(vehicleTypeId);
  }

  async fuelTypeExists(fuelTypeId: number): Promise<boolean> {
    return this.existingFuelTypeIds.has(fuelTypeId);
  }
}

function validInput() {
  return {
    id: 10,
    name: "FH16",
    brandId: 1,
    vehicleTypeId: 2,
    fuelTypeId: 3,
    isActive: false,
  };
}

describe("UpdateVehicleModel", () => {
  it("updates the model once every reference exists", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    const updateVehicleModel = new UpdateVehicleModel(writer, referenceReader);

    const result = await updateVehicleModel.execute(validInput());

    expect(result).toEqual({
      success: true,
      vehicleModel: {
        ...VEHICLE_MODEL,
        id: 10,
        name: "FH16",
        isActive: false,
      },
    });
    expect(writer.updates).toEqual([
      {
        id: 10,
        changes: {
          name: "FH16",
          brandId: 1,
          vehicleTypeId: 2,
          fuelTypeId: 3,
          isActive: false,
        },
      },
    ]);
  });

  it("returns a validation error without writing when the name is blank", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    const updateVehicleModel = new UpdateVehicleModel(writer, referenceReader);

    const result = await updateVehicleModel.execute({
      ...validInput(),
      name: "   ",
    });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["REQUIRED"] } },
    });
    expect(writer.updates).toEqual([]);
  });

  it("returns BRAND_NOT_FOUND without writing when the selected brand no longer exists", async () => {
    const writer = new VehicleModelWriterFake();
    const referenceReader = new VehicleModelReferenceReaderFake();
    const updateVehicleModel = new UpdateVehicleModel(writer, referenceReader);

    const result = await updateVehicleModel.execute({
      ...validInput(),
      brandId: 999,
    });

    expect(result).toEqual({
      success: false,
      error: { type: "BRAND_NOT_FOUND" },
    });
    expect(writer.updates).toEqual([]);
  });

  it("maps a write against a since-deleted model to a not-found error", async () => {
    const writer = new VehicleModelWriterFake();
    writer.missingId = 10;
    const referenceReader = new VehicleModelReferenceReaderFake();
    const updateVehicleModel = new UpdateVehicleModel(writer, referenceReader);

    const result = await updateVehicleModel.execute(validInput());

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
