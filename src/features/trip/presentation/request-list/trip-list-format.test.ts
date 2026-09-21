import { describe, expect, it } from "vitest";

import {
  formatTripListPassengerCount,
  formatTripListSchedule,
  tripListPurposeOrTypeLine,
} from "./trip-list-format";

describe("trip list format helpers", () => {
  it("formats schedule parts for list rows", () => {
    const parts = formatTripListSchedule(new Date("2026-05-18T04:30:00Z"));

    expect(parts.travelDayLabel.length).toBeGreaterThan(0);
    expect(parts.travelTimeLabel).toMatch(/^ساعت /);
    expect(parts.shortDateLabel.length).toBeGreaterThan(0);
  });

  it("formats passenger count in Persian digits", () => {
    expect(formatTripListPassengerCount(2)).toContain("مسافر");
  });

  it("prefers purpose over request type for the meta headline", () => {
    expect(
      tripListPurposeOrTypeLine("ماموریت اداری", "مبدأ و مقصد مشترک"),
    ).toBe("ماموریت اداری");
    expect(tripListPurposeOrTypeLine(null, "مقصد مشترک")).toBe("مقصد مشترک");
  });
});
