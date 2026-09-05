import { describe, expect, it, vi } from "vitest";
import { CreateVehicle } from "./create-vehicle";
import type { NewVehicle } from "../vehicle";
import type { VehicleIdentifier } from "../ports/vehicle-identifier-reader";

const valid = (): NewVehicle => ({ vehicleCode: " V-100 ", plateNoLeftSide: "۱۲", plateNoCenterChar: " ب ", plateNoRightSide: "٣٤٥", plateNoIranNo: "۶۷", internationalPlateNo: null, vin: null, engineNo: null, chassisNo: null, modelId: 1, vehicleStatusId: 2, modelYear: null, purchaseDate: null, purchasePrice: null, currentOdometer: null, currentEngineHour: null });
function setup() {
  const writer = { create: vi.fn<(input: NewVehicle) => Promise<{ vehicleId: number }>>().mockResolvedValue({ vehicleId: 42 }) };
  const identifiers = { identifierExists: vi.fn<(field: VehicleIdentifier, value: string) => Promise<boolean>>().mockResolvedValue(false), internalPlateExists: vi.fn(async () => false) };
  const references = { modelExists: vi.fn(async () => true), statusExists: vi.fn(async () => true) };
  return { writer, identifiers, references, useCase: new CreateVehicle(writer, identifiers, references, () => new Date("2026-09-05T12:00:00Z")) };
}
describe("CreateVehicle", () => {
  it.each([
    ["vehicleCode", " "], ["vehicleCode", "x".repeat(51)],
    ["plateNoLeftSide", ""], ["plateNoCenterChar", " "], ["plateNoRightSide", ""], ["plateNoIranNo", ""],
    ["plateNoLeftSide", "1a"], ["plateNoRightSide", "1234"], ["plateNoIranNo", "1"], ["plateNoCenterChar", "abcd"],
    ["internationalPlateNo", "x".repeat(11)], ["vin", "x".repeat(51)], ["engineNo", "x".repeat(51)], ["chassisNo", "x".repeat(51)],
    ["purchasePrice", "-1"], ["currentOdometer", "-0.01"], ["currentEngineHour", "-3"],
    ["purchasePrice", "10000000000000000"], ["purchasePrice", "0.001"], ["purchasePrice", "1e3"],
    ["modelYear", 0], ["modelYear", -1], ["modelYear", 1.5], ["modelYear", 32768], ["modelYear", NaN],
    ["modelId", 0], ["vehicleStatusId", NaN], ["purchaseDate", new Date("2026-09-06")], ["purchaseDate", new Date(NaN)],
  ] as const)("rejects invalid %s (%s) before calling dependencies", async (field, value) => {
    const s = setup();
    const result = await s.useCase.execute({ ...valid(), [field]: value });
    expect(result).toMatchObject({ success: false, error: { type: "VALIDATION_ERROR", fieldErrors: { [field]: expect.any(String) } } });
    for (const dependency of [s.writer.create, s.identifiers.identifierExists, s.identifiers.internalPlateExists, s.references.modelExists, s.references.statusExists]) expect(dependency).not.toHaveBeenCalled();
  });
  it("normalizes plate digits and strings, skips empty optional identifiers, and leaves generated fields out", async () => {
    const s = setup();
    const result = await s.useCase.execute({ ...valid(), vin: " ", engineNo: "", chassisNo: " ", internationalPlateNo: " ", purchasePrice: " 0 ", currentEngineHour: "9999999999999999.99", currentOdometer: "0", modelYear: 32767, purchaseDate: new Date("2026-09-05"), ...{ vehicleId: 99, isActive: false, createdAt: new Date() } });
    expect(result).toEqual({ success: true, vehicleId: 42 });
    expect(s.identifiers.identifierExists.mock.calls).toEqual([["vehicleCode", "V-100"]]);
    const input = s.writer.create.mock.calls[0][0];
    expect(input).toMatchObject({ vehicleCode: "V-100", plateNoLeftSide: "12", plateNoCenterChar: "ب", plateNoRightSide: "345", plateNoIranNo: "67", vin: null, engineNo: null, chassisNo: null, internationalPlateNo: null, purchasePrice: "0", currentEngineHour: "9999999999999999.99" });
    for (const field of ["vehicleId", "isActive", "createdAt"]) expect(input).not.toHaveProperty(field);
  });
  it.each([
    ["vehicleCode", "VEHICLE_CODE_ALREADY_EXISTS"], ["internationalPlateNo", "INTERNATIONAL_PLATE_ALREADY_EXISTS"], ["vin", "VIN_ALREADY_EXISTS"], ["engineNo", "ENGINE_NO_ALREADY_EXISTS"], ["chassisNo", "CHASSIS_NO_ALREADY_EXISTS"],
  ] as const)("rejects duplicate %s before reference lookup", async (field, type) => {
    const s = setup(); s.identifiers.identifierExists.mockImplementation(async key => key === field);
    expect(await s.useCase.execute({ ...valid(), [field]: " ID-1 " })).toEqual({ success: false, error: { type } });
    expect(s.identifiers.identifierExists).toHaveBeenCalledWith(field, "ID-1");
    expect(s.references.modelExists).not.toHaveBeenCalled(); expect(s.writer.create).not.toHaveBeenCalled();
  });
  it("rejects the composite plate after code lookup", async () => {
    const s = setup(); s.identifiers.internalPlateExists.mockResolvedValue(true);
    expect(await s.useCase.execute(valid())).toEqual({ success: false, error: { type: "INTERNAL_PLATE_ALREADY_EXISTS" } });
    expect(s.identifiers.identifierExists).toHaveBeenCalledTimes(1); expect(s.writer.create).not.toHaveBeenCalled(); expect(s.references.modelExists).not.toHaveBeenCalled();
  });
  it.each([["modelExists", "MODEL_NOT_FOUND"], ["statusExists", "STATUS_NOT_FOUND"]] as const)("reports missing %s", async (method, type) => {
    const s = setup(); s.references[method].mockResolvedValue(false);
    expect(await s.useCase.execute(valid())).toEqual({ success: false, error: { type } }); expect(s.writer.create).not.toHaveBeenCalled();
  });
  it("propagates unexpected persistence errors", async () => {
    const s = setup(); const error = new Error("Persistence unavailable"); s.writer.create.mockRejectedValue(error);
    await expect(s.useCase.execute(valid())).rejects.toBe(error);
  });
});
