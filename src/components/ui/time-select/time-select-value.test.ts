import { describe, expect, it } from "vitest";

import {
  commitHourText,
  commitMinuteText,
  composeCanonical,
  formatCanonicalTime,
  formatPersianTime,
  parseCanonicalTime,
  readHourInput,
  readMinuteInput,
  stepHour,
  stepMinute,
  withMinuteShortcut,
} from "./time-select-value";

describe("TimeSelect value", () => {
  it("restores a canonical default and rejects values that are not HH:mm", () => {
    expect(parseCanonicalTime("08:05")).toEqual({ hour: 8, minute: 5 });
    expect(formatCanonicalTime(parseCanonicalTime("21:00"))).toBe("21:00");
    expect(parseCanonicalTime("24:00")).toBeNull();
    expect(parseCanonicalTime("12:60")).toBeNull();
    expect(parseCanonicalTime("9:05")).toBeNull();
  });

  it("formats the closed field in Persian digits", () => {
    expect(formatPersianTime({ hour: 21, minute: 0 })).toBe("۲۱:۰۰");
    expect(formatPersianTime({ hour: 8, minute: 5 })).toBe("۰۸:۰۵");
  });

  it("changes hour and minute into canonical HH:mm", () => {
    expect(composeCanonical(stepHour(8, 1), 5)).toBe("09:05");
    expect(composeCanonical(stepHour(23, 1), stepMinute(59, 1))).toBe("00:00");
    expect(composeCanonical(stepHour(null, -1), 15)).toBe("23:15");
  });

  it("accepts an arbitrary valid minute and clamps invalid typed parts", () => {
    expect(readMinuteInput("07")).toEqual({
      text: "07",
      minute: 7,
      complete: true,
    });
    expect(readMinuteInput("59")).toMatchObject({ minute: 59, complete: true });
    expect(commitMinuteText("99")).toBe(59);
    expect(commitHourText("25")).toBe(23);
    expect(commitHourText("")).toBeNull();
    expect(readHourInput("۹")).toMatchObject({ hour: 9, complete: true });
    expect(composeCanonical(commitHourText("25"), commitMinuteText("99"))).toBe(
      "23:59",
    );
    expect(composeCanonical(null, 15)).toBe("");
  });

  it("treats quarter-hour values as shortcuts without restricting other minutes", () => {
    expect(withMinuteShortcut({ hour: 8, minute: 7 }, 30)).toEqual({
      hour: 8,
      minute: 30,
    });
    expect(withMinuteShortcut(null, 45)).toEqual({ hour: 0, minute: 45 });
    expect(composeCanonical(8, 7)).toBe("08:07");
  });
});
