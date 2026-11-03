import { describe, expect, it, vi } from "vitest";
import { createAddressLookupSession } from "./address-lookup-session";
import type { MapReverseResponse } from "../../map-place";
const point = { latitude: "35.7", longitude: "51.4" };
function deferred() {
  let resolve!: (value: MapReverseResponse) => void;
  const promise = new Promise<MapReverseResponse>(done => { resolve = done; });
  return { promise, resolve };
}
describe("map address selection", () => {
  it("accepts the provider address without inventing a street address", async () => {
    const reverse = vi.fn().mockResolvedValue({ status: "ok", address: "  Selected address  " });
    expect(await createAddressLookupSession(reverse).select(point)).toEqual({ status: "ok", address: "Selected address" });
    expect(reverse).toHaveBeenCalledWith(point);
  });
  it("ignores a slower answer for an earlier point", async () => {
    const first = deferred(), second = deferred();
    const reverse = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const session = createAddressLookupSession(reverse);
    const old = session.select(point), latest = session.select({ latitude: "36", longitude: "52" });
    second.resolve({ status: "ok", address: "Latest" });
    expect(await latest).toEqual({ status: "ok", address: "Latest" });
    first.resolve({ status: "ok", address: "Old" });
    expect(await old).toEqual({ status: "obsolete" });
  });
  it("does not return an address after the dialog closes", async () => {
    const pending = deferred();
    const session = createAddressLookupSession(() => pending.promise);
    const result = session.select(point); session.close();
    pending.resolve({ status: "ok", address: "Ignored" });
    expect(await result).toEqual({ status: "obsolete" });
  });
  it.each([{ status: "unavailable" }, { status: "invalid" }, { status: "ok", address: " " }] as MapReverseResponse[])("rejects unusable provider output %j", async response => {
    expect(await createAddressLookupSession(async () => response).select(point)).toEqual({ status: "unavailable" });
  });
  it("turns service exceptions into a recoverable manual-entry outcome", async () => {
    expect(await createAddressLookupSession(async () => { throw new Error("Offline"); }).select(point)).toEqual({ status: "unavailable" });
  });
});
