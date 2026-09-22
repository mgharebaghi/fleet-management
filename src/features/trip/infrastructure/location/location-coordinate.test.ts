import { describe, expect, it } from "vitest";

import { decimalToCoordinateString } from "./location-coordinate";

describe("stored location coordinates", () => {
  it("serializes decimal scale without trailing zeros", () => {
    expect(decimalToCoordinateString({ toFixed: () => "35.123456" })).toBe("35.123456");
    expect(decimalToCoordinateString({ toFixed: () => "32.500000" })).toBe("32.5");
    expect(decimalToCoordinateString({ toFixed: () => "-53.250000" })).toBe("-53.25");
    expect(decimalToCoordinateString(null)).toBeNull();
  });

  it("rejects an unexpected decimal representation", () => {
    expect(decimalToCoordinateString({ toFixed: () => "1e1" })).toBeNull();
  });
});
