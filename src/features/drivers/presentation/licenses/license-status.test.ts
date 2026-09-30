import { describe, expect, it } from "vitest";
import { getLicenseExpiryStatus } from "./license-status";

const now = new Date("2026-06-10T08:00:00Z");

describe("license expiry status", () => {
  it.each([
    [new Date("2026-06-11T08:00:00Z"), null, "info"],
    [null, null, "positive"],
    [new Date("2026-01-01T08:00:00Z"), new Date("2026-06-09T08:00:00Z"), "negative"],
    [new Date("2026-01-01T08:00:00Z"), new Date("2026-06-20T08:00:00Z"), "warning"],
    [new Date("2026-01-01T08:00:00Z"), new Date("2027-01-01T08:00:00Z"), "positive"],
  ] as const)("classifies issue %s / expiry %s as %s", (issueDate, expireDate, tone) => {
    expect(getLicenseExpiryStatus({ issueDate, expireDate }, now).tone).toBe(tone);
  });
  it("keeps progress null without an issue date", () => {
    expect(getLicenseExpiryStatus({ issueDate: null, expireDate: new Date("2027-01-01T08:00:00Z") }, now).progress).toBeNull();
  });
  it("computes elapsed fraction between issue and expiry", () => {
    const status = getLicenseExpiryStatus({ issueDate: new Date("2026-01-01T08:00:00Z"), expireDate: new Date("2027-01-01T08:00:00Z") }, now);
    expect(status.progress).toBeGreaterThan(0);
    expect(status.progress).toBeLessThan(1);
  });
});
