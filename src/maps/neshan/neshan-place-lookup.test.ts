import { describe, expect, it, vi } from "vitest";

import { mapCoordinateFromDegrees } from "../map-coordinate";
import {
  isCurrentLookup,
  lookupCacheKey,
  normalizeSearchTerm,
} from "../map-place";
import {
  buildNeshanReverseUrl,
  buildNeshanSearchUrl,
  reverseNeshanPlace,
  searchNeshanPlaces,
} from "./neshan-place-lookup";

const center = { latitude: "35.7", longitude: "51.4" };
const options = { apiKey: "test-service-key" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Neshan place lookup", () => {
  it("builds an encoded search request around the caller center", () => {
    const url = buildNeshanSearchUrl("  میدان   تجریش ", center);
    expect(url).not.toBeNull();
    expect(url?.origin).toBe("https://api.neshan.org");
    expect(url?.pathname).toBe("/v3/search");
    expect(url?.href).not.toContain("میدان");
    expect(url?.href).not.toContain("test-service-key");
    expect(JSON.parse(url?.searchParams.get("q") ?? "")).toEqual({
      term: "میدان تجریش",
      center: { latitude: 35.7, longitude: 51.4 },
    });
  });

  it("rejects a short search before building a request", () => {
    expect(normalizeSearchTerm(" ت ")).toBeNull();
    expect(buildNeshanSearchUrl("ت", center)).toBeNull();
  });

  it("builds a reverse request from validated coordinates", () => {
    const url = buildNeshanReverseUrl({ latitude: "۳۵٫۷", longitude: "51.400000" });
    expect(url?.pathname).toBe("/v5/reverse");
    expect(url?.searchParams.get("lat")).toBe("35.7");
    expect(url?.searchParams.get("lng")).toBe("51.400000");
  });

  it("does not call Neshan for an invalid coordinate or a missing service key", async () => {
    const fetchImpl = vi.fn();
    expect(
      await searchNeshanPlaces(
        { term: "تهران", latitude: "999", longitude: "51" },
        { ...options, fetchImpl },
      ),
    ).toEqual({ status: "invalid" });
    expect(
      await searchNeshanPlaces(
        { term: "تهران", latitude: "35.7", longitude: "51.4" },
        { apiKey: null, fetchImpl },
      ),
    ).toEqual({ status: "unavailable" });
    expect(
      await reverseNeshanPlace(
        { latitude: "35.7", longitude: "51.4" },
        { apiKey: "  ", fetchImpl },
      ),
    ).toEqual({ status: "unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes search items and drops provider identifiers", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        count: 2,
        items: [
          {
            title: "میدان تجریش",
            address: "میدان تجریش",
            region: "تهران، استان تهران",
            category: "place",
            type: "town_square",
            location: { x: 51.428857736, y: 35.806987356 },
            poiHash: "provider-secret",
          },
          { title: "بدون مختصات" },
        ],
      }),
    );
    const result = await searchNeshanPlaces(
      { term: "تجریش", latitude: "35.8", longitude: "51.4" },
      { ...options, fetchImpl },
    );
    const coordinate = mapCoordinateFromDegrees(35.806987356, 51.428857736);
    expect(result).toMatchObject({
      status: "ok",
      results: [
        {
          title: "میدان تجریش",
          address: "میدان تجریش",
          coordinate,
          region: "تهران، استان تهران",
          category: "place",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("poiHash");
    expect(JSON.stringify(result)).not.toContain("town_square");
    expect(JSON.stringify(result)).not.toContain("provider-secret");
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.href).not.toContain("test-service-key");
    expect(new Headers(init.headers).get("Api-Key")).toBe("test-service-key");
  });

  it.each([401, 403, 480, 485, 500])(
    "maps search HTTP %s to unavailable without the response body",
    async (status) => {
      const fetchImpl = vi.fn().mockResolvedValue(
        jsonResponse({ status: "ApiServiceListError", detail: "raw provider payload" }, status),
      );
      await expect(
        searchNeshanPlaces(
          { term: "تهران", latitude: "35.7", longitude: "51.4" },
          { ...options, fetchImpl },
        ),
      ).resolves.toEqual({ status: "unavailable" });
    },
  );

  it("maps network and timeout failures to unavailable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(
      reverseNeshanPlace(center, { ...options, fetchImpl }),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("returns only the formatted reverse address", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        formatted_address: " تهران، دکتر فاطمی ",
        in_traffic_zone: true,
        place: null,
      }),
    );
    await expect(reverseNeshanPlace(center, { ...options, fetchImpl })).resolves.toEqual({
      status: "ok",
      address: "تهران، دکتر فاطمی",
    });
  });

  it("treats a reverse body without an address as unavailable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: "ERROR" }));
    await expect(reverseNeshanPlace(center, { ...options, fetchImpl })).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("ignores a stale lookup generation", () => {
    expect(isCurrentLookup(2, 2)).toBe(true);
    expect(isCurrentLookup(1, 2)).toBe(false);
    expect(lookupCacheKey("تهران", center)).toBe("تهران\n35.7\n51.4");
  });
});
