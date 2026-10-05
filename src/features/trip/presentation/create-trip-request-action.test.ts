import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTripRequestAction } from "./trip.actions";

const { createRequest, redirect } = vi.hoisted(() => ({ createRequest: vi.fn(), redirect: vi.fn() }));
vi.mock("../composition/trip.factory", () => ({ makeManageTrips: () => ({ createRequest }), makeReadTrips: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

const values = {
  tripRequestTypeId: "1", requestedTravelDay: "2026-02-01", requestedTravelTime: "08:00",
  "passenger.0.personId": "1", "passenger.0.originLocationId": "1", "passenger.0.destinationLocationId": "2",
};

describe("create request pickup transport", () => {
  it("maps a repeated passenger to their own form field", async () => {
    createRequest.mockResolvedValue({ success: false, error: "DUPLICATE_PASSENGER", failedPassengerIndex: 2 });
    expect(await createTripRequestAction(values)).toMatchObject({ success: false, error: "DUPLICATE_PASSENGER", field: "passenger.2.personId" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps an equal shared route to the shared destination", async () => {
    createRequest.mockResolvedValue({ success: false, error: "SAME_ORIGIN_DESTINATION", failedLocation: { passengerIndex: 1, locationRole: "destination" } });
    expect(await createTripRequestAction({ ...values, requestTypeCode: "COMMON_ORIGIN_DESTINATION" }))
      .toMatchObject({ success: false, error: "SAME_ORIGIN_DESTINATION", field: "commonDestinationLocationId" });
  });
  beforeEach(() => { vi.clearAllMocks(); createRequest.mockResolvedValue({ success: false, error: "PURPOSE_TOO_LONG" }); });
  it("retains the passenger's explicit Tehran pickup time", async () => {
    await createTripRequestAction({ ...values, "passenger.0.pickupOverride": "true", "passenger.0.pickupDay": "2026-02-01", "passenger.0.pickupTime": "09:30" });
    expect(createRequest.mock.calls[0][0].passengers[0].requestedPickupDateTime).toEqual(new Date("2026-02-01T06:00:00Z"));
  });
  it("inherits the request time when override is disabled", async () => {
    await createTripRequestAction({ ...values, "passenger.0.pickupOverride": "false", "passenger.0.pickupTime": "09:30" });
    expect(createRequest.mock.calls[0][0].passengers[0].requestedPickupDateTime).toEqual(new Date("2026-02-01T04:30:00Z"));
  });
  it("reports an incomplete override without saving", async () => {
    expect(await createTripRequestAction({ ...values, "passenger.0.pickupOverride": "true" })).toEqual({ success: false, error: "INVALID_DATE", field: "passenger.0.pickupDay" });
    expect(createRequest).not.toHaveBeenCalled();
  });
});
