import { describe, expect, it } from "vitest";

import {
  cumulativeKilometers,
  decodeRoutePolyline,
  routeKilometersFromMeters,
  routeMinutesFromSeconds,
} from "./map-route";

describe("route measurements", () => {
  it("decodes a Neshan encoded polyline into map coordinates", () => {
    const path = decodeRoutePolyline("_p~iF~ps|U");
    expect(path).toHaveLength(1);
    expect(path[0]?.latitude.startsWith("38.5")).toBe(true);
    expect(path[0]?.longitude.startsWith("-120.2")).toBe(true);
  });

  it("rejects a truncated polyline instead of guessing the rest", () => {
    expect(decodeRoutePolyline("_p~iF")).toEqual([]);
  });

  it("converts meters to kilometers with two-decimal rounding", () => {
    expect(routeKilometersFromMeters(1820)).toBe("1.82");
    expect(routeKilometersFromMeters(555)).toBe("0.56");
    expect(routeKilometersFromMeters(0)).toBe("0");
    expect(routeKilometersFromMeters(-1)).toBeNull();
  });

  it("converts seconds to whole minutes", () => {
    expect(routeMinutesFromSeconds(487)).toBe(8);
    expect(routeMinutesFromSeconds(90)).toBe(2);
    expect(routeMinutesFromSeconds(20)).toBe(0);
    expect(routeMinutesFromSeconds(-5)).toBeNull();
  });

  it("builds cumulative intermediate distances from route legs", () => {
    expect(cumulativeKilometers(["40", "25", "10"], 2)).toEqual(["40", "65"]);
    expect(cumulativeKilometers(["1.5", "0.25"], 1)).toEqual(["1.5"]);
    expect(cumulativeKilometers(["10"], 1)).toBeNull();
  });
});
