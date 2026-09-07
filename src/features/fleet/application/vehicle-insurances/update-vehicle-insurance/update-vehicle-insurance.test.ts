import { describe, expect, it, vi } from "vitest";

import { InsuranceVehicleNotFoundError, VehicleInsuranceNotFoundError } from "../ports/vehicle-insurance-writer";
import type { NewVehicleInsurance } from "../vehicle-insurance";
import { UpdateVehicleInsurance } from "./update-vehicle-insurance";
import type { UpdateVehicleInsuranceInput } from "./update-vehicle-insurance.contract";

const validNew = (): NewVehicleInsurance => ({
  vehicleId: 1, insuranceType: " Liability ", insuranceCompany: " Company ",
  policyNo: " P-1 ", startDate: new Date("2024-03-20"), expireDate: new Date("2025-03-20"),
  premiumAmount: " 0 ", coverageAmount: "9999999999999999.99",
});
const validInput = (): UpdateVehicleInsuranceInput => ({ ...validNew(), vehicleInsuranceId: "42", isActive: false });

function setup() {
  const writer = { create: vi.fn(), update: vi.fn(async () => {}), remove: vi.fn() };
  const vehicles = { vehicleExists: vi.fn(async () => true), listVehicles: vi.fn(async () => []) };
  return { writer, vehicles, useCase: new UpdateVehicleInsurance(writer, vehicles) };
}

describe("UpdateVehicleInsurance", () => {
  it("updates the record once validation and reference checks pass", async () => {
    const { writer, useCase } = setup();

    const result = await useCase.execute(validInput());

    expect(result).toEqual({ success: true });
    expect(writer.update).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ insuranceType: "Liability", isActive: false }),
    );
  });

  it("returns a validation error without writing when the type is blank", async () => {
    const { writer, useCase } = setup();

    const result = await useCase.execute({ ...validInput(), insuranceType: " " });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { insuranceType: "REQUIRED" } },
    });
    expect(writer.update).not.toHaveBeenCalled();
  });

  it("returns VEHICLE_NOT_FOUND without writing when the selected vehicle no longer exists", async () => {
    const { writer, vehicles, useCase } = setup();
    vehicles.vehicleExists.mockResolvedValueOnce(false);

    const result = await useCase.execute(validInput());

    expect(result).toEqual({ success: false, error: { type: "VEHICLE_NOT_FOUND" } });
    expect(writer.update).not.toHaveBeenCalled();
  });

  it("maps a race against a deleted vehicle reference during write to VEHICLE_NOT_FOUND", async () => {
    const { writer, useCase } = setup();
    writer.update.mockRejectedValueOnce(new InsuranceVehicleNotFoundError());

    const result = await useCase.execute(validInput());

    expect(result).toEqual({ success: false, error: { type: "VEHICLE_NOT_FOUND" } });
  });

  it("maps a write against a since-deleted insurance record to a not-found error", async () => {
    const { writer, useCase } = setup();
    writer.update.mockRejectedValueOnce(new VehicleInsuranceNotFoundError());

    const result = await useCase.execute(validInput());

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
