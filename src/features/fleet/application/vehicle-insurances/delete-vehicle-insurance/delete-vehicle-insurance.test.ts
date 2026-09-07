import { describe, expect, it, vi } from "vitest";

import { VehicleInsuranceNotFoundError } from "../ports/vehicle-insurance-writer";
import { DeleteVehicleInsurance } from "./delete-vehicle-insurance";

function setup() {
  const writer = { create: vi.fn(), update: vi.fn(), remove: vi.fn(async () => {}) };
  return { writer, useCase: new DeleteVehicleInsurance(writer) };
}

describe("DeleteVehicleInsurance", () => {
  it("removes the record through the writer", async () => {
    const { writer, useCase } = setup();

    const result = await useCase.execute("42");

    expect(result).toEqual({ success: true });
    expect(writer.remove).toHaveBeenCalledWith("42");
  });

  it("maps a missing record to a NOT_FOUND error instead of throwing", async () => {
    const { writer, useCase } = setup();
    writer.remove.mockRejectedValueOnce(new VehicleInsuranceNotFoundError());

    const result = await useCase.execute("42");

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
