import { describe, expect, it } from "vitest";
import { insuranceFormFields, parseInsuranceFormData } from "./create-vehicle-insurance.form-data";

function form() {
  const data = new FormData(); insuranceFormFields.forEach(field => data.set(field, ""));
  data.set("vehicleId", "۱۲"); data.set("startDate", "2024-03-20"); data.set("expireDate", "2099-03-20");
  return data;
}
describe("parseInsuranceFormData", () => {
  it("parses standard dates and numeral transport without losing decimal precision", () => {
    const data = form(); data.set("premiumAmount", "9999999999999999.99");
    const result = parseInsuranceFormData(data);
    expect(result).toMatchObject({ success: true, input: { vehicleId: 12, startDate: new Date("2024-03-20"), expireDate: new Date("2099-03-20"), premiumAmount: "9999999999999999.99" } });
  });
  it.each(["2024-02-30", "2023-02-29", "2024-13-01", "", "invalid", "1403/01/01"])("does not silently roll over or accept malformed date %s", value => {
    const data = form(); data.set("startDate", value); const result = parseInsuranceFormData(data);
    expect(result.success).toBe(true);
    if (result.success) expect(Number.isNaN(result.input.startDate.getTime())).toBe(true);
  });
  it("leaves negative amounts for application validation", () => {
    const data = form(); data.set("premiumAmount", "-1");
    expect(parseInsuranceFormData(data)).toMatchObject({ input: { premiumAmount: "-1" } });
  });
  it("rejects missing, duplicate and non-string fields", () => {
    expect(parseInsuranceFormData(new FormData())).toEqual({ success: false });
    const duplicate = form(); duplicate.append("vehicleId", "1"); expect(parseInsuranceFormData(duplicate)).toEqual({ success: false });
    const file = form(); file.set("policyNo", new Blob(["value"]), "policy.txt"); expect(parseInsuranceFormData(file)).toEqual({ success: false });
  });
});
