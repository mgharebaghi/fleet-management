import { describe, expect, it } from "vitest";
import { parseVehicleFormData, vehicleTextFields } from "./create-vehicle.form-data";
function form() { const data = new FormData(); vehicleTextFields.forEach(field => data.set(field, "")); return data; }
describe("Vehicle form parsing", () => {
  it("reads the picker's Gregorian date and normalizes digits while preserving decimal precision", () => {
    const data = form(); data.set("purchaseDate", "2024-03-20"); data.set("purchasePrice", "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹.۹۹"); data.set("modelId", "۱۲");
    const result = parseVehicleFormData(data);
    expect(result).toMatchObject({ success: true, input: { purchaseDate: new Date("2024-03-20T00:00:00Z"), purchasePrice: "9999999999999999.99", modelId: 12 } });
  });
  it("leaves an untouched optional date null", () => {
    expect(parseVehicleFormData(form())).toMatchObject({ success: true, input: { purchaseDate: null } });
  });
  it("keeps a malformed date available for Application validation", () => {
    const data = form(); data.set("purchaseDate", "1403/13/01"); const result = parseVehicleFormData(data);
    expect(result.success && Number.isNaN(result.input.purchaseDate!.getTime())).toBe(true);
  });
  it("rejects missing or non-string transport fields", () => {
    const data = form(); data.delete("vin"); expect(parseVehicleFormData(data)).toEqual({ success: false });
    data.set("vin", new Blob(["x"])); expect(parseVehicleFormData(data)).toEqual({ success: false });
  });
});
