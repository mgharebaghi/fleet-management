import { describe, expect, it } from "vitest";

import {
  normalizeVehicleNumerals,
  normalizeVehicleSearchText,
} from "./vehicle-text";

describe("normalizeVehicleNumerals", () => {
  it("folds Persian and Arabic digits and leaves other characters alone", () => {
    expect(normalizeVehicleNumerals("۱۲٣٤ب")).toBe("1234ب");
  });
});

describe("normalizeVehicleSearchText", () => {
  it("folds the Arabic letter forms a keyboard produces for Persian names", () => {
    expect(normalizeVehicleSearchText("كيا")).toBe("کیا");
  });

  it("folds digits the same way the identifiers are stored", () => {
    expect(normalizeVehicleSearchText("۱۴۰۲")).toBe("1402");
  });
});
