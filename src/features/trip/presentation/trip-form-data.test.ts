import { describe, expect, it } from "vitest";

import {
  parseOptionalInteger,
  parseTehranDateTime,
  tripFormValues,
} from "./trip-form-data";

describe("Trip form parsing", () => {
  it("converts Tehran wall time to an instant", () => {
    expect(
      parseTehranDateTime("2025-03-21", "08:00")?.toISOString(),
    ).toBe("2025-03-21T04:30:00.000Z");
  });

  it("keeps a fully empty optional datetime null and rejects partial input", () => {
    expect(parseTehranDateTime("", "")).toBeNull();
    expect(parseTehranDateTime("2025-03-21", "")?.getTime()).toBeNaN();
  });

  it("parses optional SQL integer input without accepting decimals", () => {
    expect(parseOptionalInteger("")).toBeNull();
    expect(parseOptionalInteger("-2")).toBe(-2);
    expect(parseOptionalInteger("1.5")).toBeNaN();
  });

  it("rejects duplicate form keys and ignores React action metadata", () => {
    const valid = new FormData();
    valid.set("$ACTION_ID", "ignored");
    valid.set("status", "New");
    expect(tripFormValues(valid)).toEqual({ status: "New" });

    const duplicate = new FormData();
    duplicate.append("status", "New");
    duplicate.append("status", "Assigned");
    expect(tripFormValues(duplicate)).toBeNull();
  });
});
