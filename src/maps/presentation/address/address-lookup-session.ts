import type { MapCoordinate } from "../../map-coordinate";
import type { MapReverseResponse } from "../../map-place";

export type AddressLookupResult = { status: "ok"; address: string } | { status: "unavailable" | "obsolete" };

/** A previous point or a closed dialog must never supply the selected address. */
export function createAddressLookupSession(reverse: (point: MapCoordinate) => Promise<MapReverseResponse>) {
  let generation = 0;
  let closed = false;
  return {
    close() { closed = true; generation += 1; },
    async select(point: MapCoordinate): Promise<AddressLookupResult> {
      const current = ++generation;
      let result: MapReverseResponse;
      try { result = await reverse(point); }
      catch { result = { status: "unavailable" }; }
      if (closed || current !== generation) return { status: "obsolete" };
      return result.status === "ok" && result.address.trim()
        ? { status: "ok", address: result.address.trim() }
        : { status: "unavailable" };
    },
  };
}
