import { describe, expect, it } from "vitest";

import {
  getCreateVehicleModelFieldErrors,
  getCreateVehicleModelStatusMessage,
} from "./create-vehicle-model.messages";

describe("getCreateVehicleModelFieldErrors", () => {
  it("maps Application name validation codes to Persian messages", () => {
    expect(
      getCreateVehicleModelFieldErrors({
        status: "validation_error",
        fieldErrors: { name: ["REQUIRED", "TOO_LONG"] },
      }),
    ).toEqual({
      name: [
        "نام مدل الزامی است.",
        "نام مدل حداکثر ۱۰۰ کاراکتر می‌تواند باشد.",
      ],
      brandId: [],
      vehicleTypeId: [],
      fuelTypeId: [],
    });
  });

  it.each([
    ["brand_required", "انتخاب برند الزامی است."],
    ["vehicle_type_required", "انتخاب نوع خودرو الزامی است."],
    ["fuel_type_required", "انتخاب نوع سوخت الزامی است."],
    ["brand_not_found", "برند انتخاب‌شده دیگر موجود نیست."],
    ["vehicle_type_not_found", "نوع خودروی انتخاب‌شده معتبر نیست."],
    ["fuel_type_not_found", "نوع سوخت انتخاب‌شده معتبر نیست."],
  ] as const)("maps %s beside its related field", (status, message) => {
    const errors = getCreateVehicleModelFieldErrors({ status });

    expect(Object.values(errors).flat()).toEqual([message]);
  });
});

describe("getCreateVehicleModelStatusMessage", () => {
  it("returns a Persian message for malformed form data", () => {
    expect(
      getCreateVehicleModelStatusMessage({ status: "invalid_form" }),
    ).toBe("داده‌های فرم قابل پردازش نیست. لطفاً دوباره تلاش کنید.");
  });

  it("returns null for field errors and idle state", () => {
    expect(
      getCreateVehicleModelStatusMessage({ status: "brand_not_found" }),
    ).toBeNull();
    expect(getCreateVehicleModelStatusMessage({ status: "idle" })).toBeNull();
  });
});
