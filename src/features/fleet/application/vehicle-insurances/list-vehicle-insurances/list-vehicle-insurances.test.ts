import { describe, expect, it, vi } from "vitest";
import { ListVehicleInsurances, MAX_INSURANCE_PAGE } from "./list-vehicle-insurances";
import { ListInsuranceVehicles } from "../list-insurance-vehicles/list-insurance-vehicles";

describe("ListVehicleInsurances", () => {
  it("uses active records, twenty rows and page one by default", async () => {
    const result = { insurances: [], totalCount: 0 }; const reader = { search: vi.fn(async () => result) };
    expect(await new ListVehicleInsurances(reader).execute()).toBe(result);
    expect(reader.search).toHaveBeenCalledWith({ search: null, isActive: true, pageNumber: 1, pageSize: 20 });
  });
  it("normalizes search and bounds paging while preserving all/inactive selection", async () => {
    const reader = { search: vi.fn(async () => ({ insurances: [], totalCount: 0 })) }; const list = new ListVehicleInsurances(reader);
    await list.execute({ search: "  ك۱۲٣ي ", isActive: null, pageNumber: 999999999, pageSize: 1000 });
    expect(reader.search).toHaveBeenLastCalledWith({ search: "ک123ی", isActive: null, pageNumber: MAX_INSURANCE_PAGE, pageSize: 100 });
    await list.execute({ search: " ", isActive: false, pageNumber: -1, pageSize: NaN });
    expect(reader.search).toHaveBeenLastCalledWith({ search: null, isActive: false, pageNumber: 1, pageSize: 20 });
  });
  it("propagates read failures", async () => {
    const error = new Error("offline");
    await expect(new ListVehicleInsurances({ search: vi.fn().mockRejectedValue(error) }).execute()).rejects.toBe(error);
  });
  it("passes through vehicle options without filtering inactive references", async () => {
    const rows = [{ vehicleId: 1, vehicleCode: "V-1", brandName: "Brand-1", modelName: "Model-1", isActive: false, plateNoLeftSide: "12", plateNoCenterChar: null, plateNoRightSide: null, plateNoIranNo: null }];
    const vehicles = { vehicleExists: vi.fn(async () => true), listVehicles: vi.fn(async () => rows) };
    expect(await new ListInsuranceVehicles(vehicles).execute()).toBe(rows);
  });
});
