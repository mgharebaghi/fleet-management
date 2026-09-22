import { describe, expect, it } from "vitest";

import {
  acceptAddressSuggestion,
  LOCATION_TYPE_SUGGESTIONS,
  proposeLocationAddress,
  proposeLocationName,
} from "./location-assist";

describe("location assistance", () => {
  it("offers location type suggestions without closing the free-text field", () => {
    expect(LOCATION_TYPE_SUGGESTIONS).toEqual([
      "دفتر مرکزی",
      "شرکت تابعه",
      "شعبه / نمایندگی",
      "کارخانه / سایت عملیاتی",
      "انبار",
      "پروژه / کارگاه",
      "سازمان / اداره",
      "فرودگاه / پایانه",
    ]);
    expect(LOCATION_TYPE_SUGGESTIONS).not.toContain("کارگاه موقت پروژه");
  });

  it("fills an empty location name and preserves one the user already entered", () => {
    expect(proposeLocationName("", false, "میدان تجریش")).toEqual({
      value: "میدان تجریش",
      edited: false,
    });
    expect(proposeLocationName("دفتر شرکت", true, "میدان تجریش")).toEqual({
      value: "دفتر شرکت",
      edited: true,
    });
    expect(proposeLocationName("دفتر شرکت", false, "میدان تجریش")).toEqual({
      value: "دفتر شرکت",
      edited: false,
    });
    expect(proposeLocationName("", true, "میدان تجریش")).toEqual({
      value: "",
      edited: true,
    });
  });

  it("applies an address until the user edits it, then only suggests the next one", () => {
    expect(proposeLocationAddress("", false, null, "تهران، فاطمی")).toEqual({
      value: "تهران، فاطمی",
      edited: false,
      suggestion: null,
    });
    expect(
      proposeLocationAddress("تهران، فاطمی", false, null, "تهران، ونک"),
    ).toEqual({
      value: "تهران، ونک",
      edited: false,
      suggestion: null,
    });
    expect(
      proposeLocationAddress("نشانی دستی", true, null, "تهران، ونک"),
    ).toEqual({
      value: "نشانی دستی",
      edited: true,
      suggestion: "تهران، ونک",
    });
  });

  it("applies a suggested address only when the user asks for it", () => {
    expect(acceptAddressSuggestion("نشانی دستی", true, "تهران، ونک")).toEqual({
      value: "تهران، ونک",
      edited: true,
      suggestion: null,
    });
  });
});
