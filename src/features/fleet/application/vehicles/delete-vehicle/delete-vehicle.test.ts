import { describe, expect, it, vi } from "vitest";

import { VehicleInUseError, VehicleNotFoundError } from "../ports/vehicle-writer";
import { DeleteVehicle } from "./delete-vehicle";

function setup() {
  const writer = { create: vi.fn(), update: vi.fn(), remove: vi.fn(async () => {}) };
  return { writer, useCase: new DeleteVehicle(writer) };
}

describe("DeleteVehicle", () => {
  it("removes the vehicle through the writer", async () => {
    const { writer, useCase } = setup();

    const result = await useCase.execute(7);

    expect(result).toEqual({ success: true });
    expect(writer.remove).toHaveBeenCalledWith(7);
  });

  it("maps a foreign-key-in-use failure to an IN_USE error instead of throwing", async () => {
    const { writer, useCase } = setup();
    writer.remove.mockRejectedValueOnce(new VehicleInUseError());

    const result = await useCase.execute(7);

    expect(result).toEqual({ success: false, error: { type: "IN_USE" } });
  });

  it("maps a missing vehicle to a NOT_FOUND error instead of throwing", async () => {
    const { writer, useCase } = setup();
    writer.remove.mockRejectedValueOnce(new VehicleNotFoundError());

    const result = await useCase.execute(7);

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
