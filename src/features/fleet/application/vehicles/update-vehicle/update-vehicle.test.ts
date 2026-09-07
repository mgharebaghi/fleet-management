import { describe, expect, it, vi } from "vitest";

import type { VehicleIdentifier } from "../ports/vehicle-identifier-reader";
import { VehicleNotFoundError } from "../ports/vehicle-writer";
import type { NewVehicle } from "../vehicle";
import { UpdateVehicle } from "./update-vehicle";

const valid = (): NewVehicle => ({
  vehicleCode: " V-100 ", plateNoLeftSide: "۱۲", plateNoCenterChar: " ب ",
  plateNoRightSide: "٣٤٥", plateNoIranNo: "۶۷", internationalPlateNo: null,
  vin: null, engineNo: null, chassisNo: null, modelId: 1, vehicleStatusId: 2,
  modelYear: null, purchaseDate: null, purchasePrice: null, currentOdometer: null,
  currentEngineHour: null,
});

function setup() {
  const writer = { create: vi.fn(async () => ({ vehicleId: 42 })), update: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
  const identifiers = {
    identifierExists: vi.fn<(field: VehicleIdentifier, value: string, excludeId?: number) => Promise<boolean>>().mockResolvedValue(false),
    internalPlateExists: vi.fn(async () => false),
  };
  const references = { modelExists: vi.fn(async () => true), statusExists: vi.fn(async () => true) };
  return { writer, identifiers, references, useCase: new UpdateVehicle(writer, identifiers, references, () => new Date("2026-09-05T12:00:00Z")) };
}

describe("UpdateVehicle", () => {
  it("updates the vehicle once validation and reference checks pass", async () => {
    const { writer, identifiers, useCase } = setup();

    const result = await useCase.execute({ ...valid(), vehicleId: 7 });

    expect(result).toEqual({ success: true });
    expect(writer.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ vehicleCode: "V-100" }),
    );
    expect(identifiers.identifierExists).toHaveBeenCalledWith("vehicleCode", "V-100", 7);
  });

  it("excludes the vehicle's own id from every uniqueness check", async () => {
    const { identifiers, useCase } = setup();

    await useCase.execute({ ...valid(), vin: "VIN-1", vehicleId: 7 });

    expect(identifiers.internalPlateExists).toHaveBeenCalledWith(
      expect.objectContaining({ plateNoLeftSide: "12" }),
      7,
    );
    expect(identifiers.identifierExists).toHaveBeenCalledWith("vin", "VIN-1", 7);
  });

  it("returns a validation error without writing when a required field is blank", async () => {
    const { writer, useCase } = setup();

    const result = await useCase.execute({ ...valid(), vehicleCode: " ", vehicleId: 7 });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { vehicleCode: "REQUIRED" } },
    });
    expect(writer.update).not.toHaveBeenCalled();
  });

  it("returns a duplicate error without writing when another vehicle already has the code", async () => {
    const { writer, identifiers, useCase } = setup();
    identifiers.identifierExists.mockResolvedValueOnce(true);

    const result = await useCase.execute({ ...valid(), vehicleId: 7 });

    expect(result).toEqual({
      success: false,
      error: { type: "VEHICLE_CODE_ALREADY_EXISTS" },
    });
    expect(writer.update).not.toHaveBeenCalled();
  });

  it("returns MODEL_NOT_FOUND without writing when the selected model no longer exists", async () => {
    const { writer, references, useCase } = setup();
    references.modelExists.mockResolvedValueOnce(false);

    const result = await useCase.execute({ ...valid(), vehicleId: 7 });

    expect(result).toEqual({ success: false, error: { type: "MODEL_NOT_FOUND" } });
    expect(writer.update).not.toHaveBeenCalled();
  });

  it("maps a write against a since-deleted vehicle to a not-found error", async () => {
    const { writer, useCase } = setup();
    writer.update.mockRejectedValueOnce(new VehicleNotFoundError());

    const result = await useCase.execute({ ...valid(), vehicleId: 7 });

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
