import { describe, expect, it } from "vitest";

import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
} from "../ports/catalog-entry-writer";
import type { VehicleModelWriter } from "../ports/vehicle-model-writer";
import type { VehicleModel } from "../vehicle-model";
import { DeleteVehicleModel } from "./delete-vehicle-model";

class VehicleModelWriterFake implements VehicleModelWriter {
  readonly removedIds: number[] = [];
  behavior: "ok" | "in_use" | "not_found" = "ok";

  async create(): Promise<VehicleModel> {
    throw new Error("not used");
  }

  async update(): Promise<VehicleModel> {
    throw new Error("not used");
  }

  async remove(id: number): Promise<void> {
    this.removedIds.push(id);
    if (this.behavior === "in_use") {
      throw new CatalogEntryInUseError();
    }
    if (this.behavior === "not_found") {
      throw new CatalogEntryNotFoundError();
    }
  }
}

describe("DeleteVehicleModel", () => {
  it("removes the model through the writer", async () => {
    const writer = new VehicleModelWriterFake();
    const deleteVehicleModel = new DeleteVehicleModel(writer);

    const result = await deleteVehicleModel.execute(10);

    expect(result).toEqual({ success: true });
    expect(writer.removedIds).toEqual([10]);
  });

  it("maps a foreign-key-in-use failure to an IN_USE error instead of throwing", async () => {
    const writer = new VehicleModelWriterFake();
    writer.behavior = "in_use";
    const deleteVehicleModel = new DeleteVehicleModel(writer);

    const result = await deleteVehicleModel.execute(10);

    expect(result).toEqual({ success: false, error: { type: "IN_USE" } });
  });

  it("maps a missing model to a NOT_FOUND error instead of throwing", async () => {
    const writer = new VehicleModelWriterFake();
    writer.behavior = "not_found";
    const deleteVehicleModel = new DeleteVehicleModel(writer);

    const result = await deleteVehicleModel.execute(10);

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
