import { describe, expect, it, vi } from "vitest";
import { CreateVehicleInsurance } from "./create-vehicle-insurance";
import { InsuranceVehicleNotFoundError } from "../ports/vehicle-insurance-writer";
import type { NewVehicleInsurance } from "../vehicle-insurance";

const valid = (): NewVehicleInsurance => ({ vehicleId: 1, insuranceType: " Liability ", insuranceCompany: " Company ", policyNo: " P-1 ", startDate: new Date("2024-03-20"), expireDate: new Date("2025-03-20"), premiumAmount: " 0 ", coverageAmount: "9999999999999999.99" });
function setup() {
  const writer = { create: vi.fn(async () => ({ vehicleInsuranceId: "9007199254740993" })) };
  const vehicles = { vehicleExists: vi.fn(async () => true), listVehicles: vi.fn(async () => []) };
  return { writer, vehicles, useCase: new CreateVehicleInsurance(writer, vehicles) };
}
describe("CreateVehicleInsurance", () => {
  it("normalizes optional strings, preserves exact amounts and omits database-managed fields", async () => {
    const s = setup();
    expect(await s.useCase.execute({ ...valid(), insuranceCompany: " ", policyNo: "", ...{ isActive: false, vehicleInsuranceId: "99" } })).toEqual({ success: true, vehicleInsuranceId: "9007199254740993" });
    expect(s.writer.create).toHaveBeenCalledWith({ ...valid(), insuranceType: "Liability", insuranceCompany: null, policyNo: null, premiumAmount: "0" });
    expect(s.vehicles.vehicleExists).toHaveBeenCalledWith(1);
  });
  it.each([
    ["insuranceType", " "], ["insuranceType", "x".repeat(101)], ["insuranceCompany", "x".repeat(151)], ["policyNo", "x".repeat(101)],
    ["vehicleId", 0], ["vehicleId", -1], ["vehicleId", 1.5], ["vehicleId", NaN], ["vehicleId", 2147483648],
    ["startDate", new Date(NaN)], ["expireDate", new Date(NaN)], ["startDate", new Date("0000-01-01")], ["expireDate", new Date("+010000-01-01")],
    ["premiumAmount", "-1"], ["coverageAmount", "-0.01"], ["premiumAmount", "10000000000000000"], ["coverageAmount", "0.001"],
    ["premiumAmount", "1e3"], ["coverageAmount", "NaN"], ["premiumAmount", "1,000"], ["coverageAmount", ".5"],
  ] as const)("rejects invalid %s before calling dependencies", async (field, value) => {
    const s = setup();
    expect(await s.useCase.execute({ ...valid(), [field]: value })).toMatchObject({ success: false, error: { type: "VALIDATION_ERROR", fieldErrors: { [field]: expect.any(String) } } });
    expect(s.writer.create).not.toHaveBeenCalled(); expect(s.vehicles.vehicleExists).not.toHaveBeenCalled();
  });
  it("rejects expiry before start", async () => {
    const s = setup();
    expect(await s.useCase.execute({ ...valid(), expireDate: new Date("2024-03-19") })).toMatchObject({ success: false, error: { fieldErrors: { expireDate: "DATE_ORDER" } } });
    expect(s.writer.create).not.toHaveBeenCalled();
  });
  it.each(["2020-01-01", "2099-01-01"])("allows equal dates, including expired and future policies (%s)", async day => {
    const s = setup();
    expect((await s.useCase.execute({ ...valid(), startDate: new Date(day), expireDate: new Date(day), premiumAmount: " ", coverageAmount: null })).success).toBe(true);
    expect(s.writer.create).toHaveBeenCalledWith(expect.objectContaining({ premiumAmount: null, coverageAmount: null }));
  });
  it("accepts maximum text lengths and trims optional values", async () => {
    const s = setup();
    expect((await s.useCase.execute({ ...valid(), insuranceType: "x".repeat(100), insuranceCompany: ` ${"x".repeat(150)} `, policyNo: ` ${"x".repeat(100)} ` })).success).toBe(true);
    expect(s.writer.create).toHaveBeenCalledWith(expect.objectContaining({ policyNo: "x".repeat(100), insuranceCompany: "x".repeat(150) }));
  });
  it("reports a missing vehicle without writing", async () => {
    const s = setup(); s.vehicles.vehicleExists.mockResolvedValue(false);
    expect(await s.useCase.execute(valid())).toEqual({ success: false, error: { type: "VEHICLE_NOT_FOUND" } });
    expect(s.writer.create).not.toHaveBeenCalled();
  });
  it("maps a reference disappearing during the write", async () => {
    const s = setup(); s.writer.create.mockRejectedValue(new InsuranceVehicleNotFoundError());
    expect(await s.useCase.execute(valid())).toEqual({ success: false, error: { type: "VEHICLE_NOT_FOUND" } });
  });
  it("propagates unexpected infrastructure errors", async () => {
    const s = setup(); const error = new Error("offline"); s.writer.create.mockRejectedValue(error);
    await expect(s.useCase.execute(valid())).rejects.toBe(error);
  });
});
