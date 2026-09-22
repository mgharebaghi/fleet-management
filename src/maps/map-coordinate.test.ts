import { describe, expect, it } from "vitest";

import {
  IRAN_MAP_OVERVIEW,
  mapCoordinateFromDegrees,
  parseMapCoordinate,
  trimCoordinateScale,
} from "./map-coordinate";

describe("map coordinates", () => {
  it("keeps the Iran overview inside the stored coordinate scale", () => {
    expect(parseMapCoordinate(IRAN_MAP_OVERVIEW.latitude, IRAN_MAP_OVERVIEW.longitude)).toEqual(
      IRAN_MAP_OVERVIEW,
    );
  });

  it("normalizes Persian and Arabic digits and the Persian decimal separator", () => {
    expect(parseMapCoordinate("۳۵٫۱۲۳۴۵۶", "٥١.٤٢")).toEqual({
      latitude: "35.123456",
      longitude: "51.42",
    });
  });

  it.each(["90.000001", "1.1234567", "abc", ""])(
    "rejects latitude %s",
    (latitude) => {
      expect(parseMapCoordinate(latitude, "51")).toBeNull();
    },
  );

  it("rejects a longitude outside the stored range", () => {
    expect(parseMapCoordinate("35", "-180.000001")).toBeNull();
  });

  it("rounds provider and click degrees to six decimal places", () => {
    expect(mapCoordinateFromDegrees(35.68921249, 51.38901234)).toEqual({
      latitude: "35.689212",
      longitude: "51.389012",
    });
  });

  it("trims a stored scale without changing the value", () => {
    expect(trimCoordinateScale("32.500000")).toBe("32.5");
    expect(trimCoordinateScale("-53.250000")).toBe("-53.25");
    expect(trimCoordinateScale("-0.000000")).toBe("0");
    expect(trimCoordinateScale("35.123456")).toBe("35.123456");
  });
});
