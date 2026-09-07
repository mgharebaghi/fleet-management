import { describe, expect, it } from "vitest";
import { formValues, parseDate, parseDateTime } from "./driver-form-data";
describe("Drivers form transport", () => {
  it("rejects duplicate scalar values", () => { const data = new FormData(); data.append("personId", "1"); data.append("personId", "2"); expect(formValues(data)).toBeNull(); });
  it("preserves text without applying business normalization", () => { const data = new FormData(); data.append("licenseNo", " A "); expect(formValues(data)).toEqual({ licenseNo: " A " }); });
  it("keeps date-only values at UTC midnight", () => { expect(parseDate("2025-03-21")?.toISOString()).toBe("2025-03-21T00:00:00.000Z"); });
  it.each(["2025-02-30", "2025-13-01", "bad"])("rejects invalid calendar date %s", value => { expect(Number.isNaN(parseDate(value)?.getTime())).toBe(true); });
  it("converts Tehran clock to a UTC instant without using host timezone", () => { expect(parseDateTime("2025-03-21", "08:00")?.toISOString()).toBe("2025-03-21T04:30:00.000Z"); });
  it("respects historical Tehran daylight saving time", () => { expect(parseDateTime("2021-07-01", "08:00")?.toISOString()).toBe("2021-07-01T03:30:00.000Z"); });
  it("distinguishes missing optional datetime from partially completed input", () => { expect(parseDateTime("", "")).toBeNull(); expect(Number.isNaN(parseDateTime("2025-03-21", "")?.getTime())).toBe(true); expect(Number.isNaN(parseDateTime("", "08:00")?.getTime())).toBe(true); });
});
