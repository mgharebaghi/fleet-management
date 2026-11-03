import { describe, expect, it } from "vitest";
import { decimalHoursFromParts, durationParts, formatDuration } from "./duration-value";
describe("decimal-hour duration display", () => {
  it("uses accumulated hours rather than a clock or decimal-as-minute interpretation", () => {
    expect(formatDuration("25.10")).toBe("25:06");
    expect(formatDuration("1250.01")).toBe("1250:00:36");
    expect(formatDuration("0.00")).toBe("00:00");
    expect(formatDuration("9999999999999999.99")).toBe("9999999999999999:59:24");
  });
  it("preserves every stored hundredth of an hour exactly in the displayed parts", () => {
    for (let fraction = 0; fraction < 100; fraction++) {
      const parts = durationParts(`25.${String(fraction).padStart(2, "0")}`)!;
      expect(Number(parts.minutes) * 60 + Number(parts.seconds)).toBe(fraction * 36);
    }
  });
  it("rounds entered minutes explicitly and preserves all integer digits", () => {
    expect(decimalHoursFromParts("۲۵", "۰۶")).toEqual({ value: "25.10", rounded: false });
    expect(decimalHoursFromParts("25", "10")).toEqual({ value: "25.17", rounded: true });
    expect(decimalHoursFromParts("9,999,999,999,999,999", "59")).toEqual({ value: "9999999999999999.98", rounded: true });
  });
  it("rejects fractional, negative or out-of-range editor parts", () => {
    for (const [hours, minutes] of [["", "00"], ["-1", "00"], ["25.10", "00"], ["1", "60"], ["10000000000000000", "00"]]) expect(decimalHoursFromParts(hours, minutes)).toBeNull();
    expect(durationParts("-1")).toBeNull(); expect(durationParts("25.123")).toBeNull();
  });
});
