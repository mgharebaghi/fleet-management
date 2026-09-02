import { describe, expect, it } from "vitest";

import {
  getGregorianEmploymentDateValue,
  getJalaliMonthLength,
  jalaliToGregorianDateString,
} from "./jalali-date";

describe("jalali date conversion", () => {
  it.each([
    [1403, 1, 1, "2024-03-20"],
    [1403, 12, 30, "2025-03-20"],
    [1404, 1, 1, "2025-03-21"],
    [1404, 12, 29, "2026-03-20"],
  ] as const)(
    "converts %i/%i/%i to %s",
    (jalaliYear, jalaliMonth, jalaliDay, expectedGregorianDate) => {
      expect(
        jalaliToGregorianDateString(
          jalaliYear,
          jalaliMonth,
          jalaliDay,
        ),
      ).toBe(expectedGregorianDate);
    },
  );

  it("uses the correct Esfand length for leap and non-leap years", () => {
    expect(getJalaliMonthLength(1403, 12)).toBe(30);
    expect(getJalaliMonthLength(1404, 12)).toBe(29);
    expect(jalaliToGregorianDateString(1404, 12, 30)).toBeNull();
  });

  it("accepts Persian year digits for the form value", () => {
    expect(getGregorianEmploymentDateValue("۱۴۰۳", "1", "1")).toBe(
      "2024-03-20",
    );
  });

  it("keeps an untouched optional date empty and marks partial dates invalid", () => {
    expect(getGregorianEmploymentDateValue("", "", "")).toBe("");
    expect(getGregorianEmploymentDateValue("1403", "1", "")).toBe(
      "invalid",
    );
  });
});
