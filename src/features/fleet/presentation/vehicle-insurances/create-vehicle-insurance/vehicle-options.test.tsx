import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { InsuranceVehicle } from "../../../application/vehicle-insurances/vehicle-insurance";
import { buildVehicleOptions } from "./vehicle-options";

function vehicle(overrides: Partial<InsuranceVehicle>): InsuranceVehicle {
  return {
    vehicleId: 1, vehicleCode: "V-1", brandName: "ایران‌خودرو", modelName: "پراید ۱۱۱",
    plateNoLeftSide: "12", plateNoCenterChar: "الف", plateNoRightSide: "345", plateNoIranNo: "67",
    isActive: true, ...overrides,
  };
}

describe("buildVehicleOptions", () => {
  it("submits the vehicle id as the option value", () => {
    const [option] = buildVehicleOptions([vehicle({ vehicleId: 42 })]);
    expect(option.value).toBe("42");
  });

  it("puts brand, model and plate in the label and search text, without the vehicle id", () => {
    const [option] = buildVehicleOptions([vehicle({})]);
    expect(option.label).toContain("ایران‌خودرو");
    expect(option.label).toContain("پراید ۱۱۱");
    expect(option.searchText).toContain("V-1");
    expect(option.label).not.toContain("کد");
  });

  it("shows an inactive badge only for inactive vehicles", () => {
    const [active, inactive] = buildVehicleOptions([
      vehicle({ vehicleId: 1, isActive: true }),
      vehicle({ vehicleId: 2, isActive: false }),
    ]);
    expect(renderToStaticMarkup(<>{active.content}</>)).not.toContain("غیرفعال");
    expect(renderToStaticMarkup(<>{inactive.content}</>)).toContain("غیرفعال");
    expect(active.label).not.toContain("غیرفعال");
    expect(inactive.label).toContain("غیرفعال");
  });

  it("shows the vehicle code only when brand, model and plate cannot tell two vehicles apart", () => {
    const [uniqueOne, ambiguousA, ambiguousB] = buildVehicleOptions([
      vehicle({ vehicleId: 1, vehicleCode: "V-1", plateNoRightSide: "111" }),
      vehicle({ vehicleId: 2, vehicleCode: "V-2", plateNoRightSide: "999" }),
      vehicle({ vehicleId: 3, vehicleCode: "V-3", plateNoRightSide: "999" }),
    ]);
    expect(renderToStaticMarkup(<>{uniqueOne.content}</>)).not.toContain("V-1");
    expect(renderToStaticMarkup(<>{ambiguousA.content}</>)).toContain("V-2");
    expect(renderToStaticMarkup(<>{ambiguousB.content}</>)).toContain("V-3");
  });

  it("gives the closed trigger its own compact content with brand, model and plate", () => {
    const [option] = buildVehicleOptions([vehicle({})]);
    const triggerMarkup = renderToStaticMarkup(<>{option.triggerContent}</>);
    expect(triggerMarkup).toContain("ایران‌خودرو");
    expect(triggerMarkup).toContain("پراید ۱۱۱");
    expect(triggerMarkup).toContain("ایران");
  });

  it("still marks the trigger inactive/ambiguous, matching the dropdown row", () => {
    const [, ambiguousInactive] = buildVehicleOptions([
      vehicle({ vehicleId: 1, vehicleCode: "V-1", plateNoRightSide: "999" }),
      vehicle({ vehicleId: 2, vehicleCode: "V-2", plateNoRightSide: "999", isActive: false }),
    ]);
    const triggerMarkup = renderToStaticMarkup(<>{ambiguousInactive.triggerContent}</>);
    expect(triggerMarkup).toContain("غیرفعال");
    expect(triggerMarkup).toContain("V-2");
  });
});
