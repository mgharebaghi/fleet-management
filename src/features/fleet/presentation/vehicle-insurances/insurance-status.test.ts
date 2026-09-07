import { describe, expect, it } from "vitest";
import { getInsuranceExpiryStatus } from "./insurance-status";

const now = new Date("2026-06-10T08:00:00Z");

describe("insurance expiry status", () => {
  it.each([
    [new Date("2026-06-11T08:00:00Z"), new Date("2027-06-11T08:00:00Z"), "info"],
    [new Date("2025-06-10T08:00:00Z"), new Date("2026-06-09T08:00:00Z"), "negative"],
    [new Date("2025-06-10T08:00:00Z"), new Date("2026-06-20T08:00:00Z"), "warning"],
    [new Date("2025-06-10T08:00:00Z"), new Date("2027-06-10T08:00:00Z"), "positive"],
  ] as const)("classifies start %s / expiry %s as %s", (startDate, expireDate, tone) => {
    expect(getInsuranceExpiryStatus({ startDate, expireDate }, now).tone).toBe(tone);
  });
  it("computes elapsed fraction between start and expiry", () => {
    const status = getInsuranceExpiryStatus({ startDate: new Date("2026-01-01T08:00:00Z"), expireDate: new Date("2027-01-01T08:00:00Z") }, now);
    expect(status.progress).toBeGreaterThan(0);
    expect(status.progress).toBeLessThan(1);
  });
});
