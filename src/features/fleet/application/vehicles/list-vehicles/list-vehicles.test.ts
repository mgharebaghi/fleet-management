import { describe, expect, it, vi } from "vitest";
import { ListVehicles } from "./list-vehicles";
describe("ListVehicles", () => {
  it("requests the first twenty active vehicles and returns the reader result", async () => {
    const result = { vehicles: [], totalCount: 7 }; const reader = { search: vi.fn(async () => result) };
    expect(await new ListVehicles(reader).execute()).toBe(result);
    expect(reader.search).toHaveBeenCalledWith({ search: null, pageNumber: 1, pageSize: 20, isActive: true, vehicleStatusId: null });
  });
  it.each([false, null, true])("preserves explicit active selection %s and status while normalizing search and capping page size", async isActive => {
    const reader = { search: vi.fn(async () => ({ vehicles: [], totalCount: 0 })) };
    await new ListVehicles(reader).execute({ search: " ۱۲٣ ", pageNumber: 2, pageSize: 101, isActive, vehicleStatusId: 8 });
    expect(reader.search).toHaveBeenCalledWith({ search: "123", pageNumber: 2, pageSize: 100, isActive, vehicleStatusId: 8 });
  });
  it("defaults invalid paging and treats blank search and invalid status as absent", async () => {
    const reader = { search: vi.fn(async () => ({ vehicles: [], totalCount: 0 })) };
    await new ListVehicles(reader).execute({ search: " ", pageNumber: -1, pageSize: 0, vehicleStatusId: NaN });
    expect(reader.search).toHaveBeenCalledWith({ search: null, pageNumber: 1, pageSize: 20, isActive: true, vehicleStatusId: null });
  });
});
