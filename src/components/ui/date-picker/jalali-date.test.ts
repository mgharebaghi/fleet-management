import { describe, expect, it } from "vitest";

import {
  addJalaliMonths,
  formatJalaliDate,
  getJalaliMonthLength,
  getJalaliMonthStartWeekday,
  gregorianToJalali,
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

  it.each([
    ["2024-03-20", 1403, 1, 1],
    ["2025-03-20", 1403, 12, 30],
    ["2025-03-21", 1404, 1, 1],
    ["2026-03-20", 1404, 12, 29],
  ] as const)(
    "converts %s back to %i/%i/%i",
    (gregorianDate, year, month, day) => {
      expect(gregorianToJalali(gregorianDate)).toEqual({ year, month, day });
    },
  );

  it("round-trips every day of a leap Esfand", () => {
    for (let day = 1; day <= 30; day += 1) {
      const gregorianDate = jalaliToGregorianDateString(1403, 12, day);

      expect(gregorianDate).not.toBeNull();
      expect(gregorianToJalali(gregorianDate!)).toEqual({
        year: 1403,
        month: 12,
        day,
      });
    }
  });

  it("places the first of a month on the right weekday of the Persian week", () => {
    // 1403/01/01 is 2024-03-20, a Wednesday: index 4 in a Saturday-first week.
    expect(getJalaliMonthStartWeekday(1403, 1)).toBe(4);
  });

  it("moves between months and clamps a day the next month does not have", () => {
    expect(addJalaliMonths({ year: 1403, month: 1, day: 31 }, 6)).toEqual({
      year: 1403,
      month: 7,
      day: 30,
    });
    expect(addJalaliMonths({ year: 1403, month: 1, day: 5 }, -1)).toEqual({
      year: 1402,
      month: 12,
      day: 5,
    });
  });

  it("formats a Jalali date with Persian digits and padded parts", () => {
    expect(formatJalaliDate({ year: 1403, month: 1, day: 1 })).toBe(
      "۱۴۰۳/۰۱/۰۱",
    );
  });
});
