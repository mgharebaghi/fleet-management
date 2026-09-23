import { describe, expect, it, vi } from "vitest";

import { decodeRoutePolyline } from "../map-route";
import {
  buildNeshanDirectionUrl,
  normalizeNeshanDirectionBody,
  routeNeshanDirections,
} from "./neshan-route-lookup";

const origin = { latitude: "35.721989", longitude: "51.334695" };
const waypoint = { latitude: "35.699722", longitude: "51.338056" };
const destination = { latitude: "35.689200", longitude: "51.389000" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const directionBody = {
  routes: [
    {
      overview_polyline: { points: "_p~iF~ps|U" },
      legs: [
        {
          summary: "provider text",
          distance: { value: 40000, text: "۴۰ کیلومتر" },
          duration: { value: 2400, text: "۴۰ دقیقه" },
        },
        {
          distance: { value: 25000, text: "۲۵ کیلومتر" },
          duration: { value: 1500, text: "۲۵ دقیقه" },
        },
      ],
    },
  ],
};

describe("Neshan direction lookup", () => {
  it("builds a car direction request with ordered waypoints", () => {
    const url = buildNeshanDirectionUrl([origin, waypoint, destination]);
    expect(url?.origin).toBe("https://api.neshan.org");
    expect(url?.pathname).toBe("/v4/direction");
    expect(url?.searchParams.get("type")).toBe("car");
    expect(url?.searchParams.get("origin")).toBe("35.721989,51.334695");
    expect(url?.searchParams.get("destination")).toBe("35.689200,51.389000");
    expect(url?.searchParams.get("waypoints")).toBe("35.699722,51.338056");
    expect(url?.searchParams.get("alternative")).toBe("false");
    expect(url?.href).not.toContain("secret");
  });

  it("omits waypoints when the path is only origin and destination", () => {
    const url = buildNeshanDirectionUrl([origin, destination]);
    expect(url?.searchParams.has("waypoints")).toBe(false);
  });

  it("does not build a request for a single coordinate", () => {
    expect(buildNeshanDirectionUrl([origin])).toBeNull();
  });

  it("normalizes geometry, total distance, duration, and legs", () => {
    expect(normalizeNeshanDirectionBody(directionBody)).toEqual({
      path: decodeRoutePolyline("_p~iF~ps|U"),
      distanceKm: "65",
      durationMinute: 65,
      legDistanceKm: ["40", "25"],
    });
  });

  it("rejects a malformed route instead of inventing geometry", () => {
    expect(normalizeNeshanDirectionBody({ routes: [{ legs: [] }] })).toBeNull();
    expect(normalizeNeshanDirectionBody({ routes: [] })).toBeNull();
    expect(normalizeNeshanDirectionBody(null)).toBeNull();
  });

  it("does not call Neshan without a service key and hides the key from the result", async () => {
    const fetchImpl = vi.fn();
    expect(
      await routeNeshanDirections([origin, destination], {
        apiKey: null,
        fetchImpl,
      }),
    ).toEqual({ status: "unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns unavailable when the provider times out or rejects the body", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"))
      .mockResolvedValueOnce(jsonResponse({ error: "bad" }, 500))
      .mockResolvedValueOnce(jsonResponse({ routes: [] }));
    const options = { apiKey: "server-only-key", fetchImpl };
    expect(await routeNeshanDirections([origin, destination], options)).toEqual({
      status: "unavailable",
    });
    expect(await routeNeshanDirections([origin, destination], options)).toEqual({
      status: "unavailable",
    });
    expect(await routeNeshanDirections([origin, destination], options)).toEqual({
      status: "unavailable",
    });
    const [url, request] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).not.toContain("server-only-key");
    expect(request.headers).toMatchObject({ "Api-Key": "server-only-key" });
  });

  it("returns the normalized route and does not echo the service key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(directionBody));
    const result = await routeNeshanDirections([origin, waypoint, destination], {
      apiKey: "server-only-key",
      fetchImpl,
    });
    expect(result.status).toBe("ok");
    expect(JSON.stringify(result)).not.toContain("server-only-key");
    expect(JSON.stringify(result)).not.toContain("overview_polyline");
    if (result.status === "ok") {
      expect(result.route.distanceKm).toBe("65");
      expect(result.route.durationMinute).toBe(65);
      expect(result.route.legDistanceKm).toEqual(["40", "25"]);
    }
  });
});
