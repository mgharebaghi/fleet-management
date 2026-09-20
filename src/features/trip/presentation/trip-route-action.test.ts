import { beforeEach, describe, expect, it, vi } from "vitest";

import { addTripRouteAction, deleteTripRouteAction } from "./trip.actions";

const { mockSaveRoute, mockDeleteRoute, makeManageTrips, revalidatePath } =
  vi.hoisted(() => ({
    mockSaveRoute: vi.fn(),
    mockDeleteRoute: vi.fn(),
    makeManageTrips: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../composition/trip.factory", () => ({
  makeManageTrips,
  makeReadTrips: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

describe("Route Actions - Persistence, Update and Safe Deletion", () => {
  beforeEach(() => {
    mockSaveRoute.mockReset();
    mockDeleteRoute.mockReset();
    makeManageTrips.mockReset();
    makeManageTrips.mockReturnValue({
      saveRoute: mockSaveRoute,
      deleteRoute: mockDeleteRoute,
    });
    revalidatePath.mockClear();
  });

  it("1. Bug 1 fix: editing an existing route with a new RoutePoint saves under existing routeId without duplicating the Route", async () => {
    mockSaveRoute.mockResolvedValue({
      success: true,
      id: 501,
    });

    const formData = new FormData();
    formData.set("routeId", "501");
    formData.set("tripId", "701");
    formData.set("routeName", "مسیر اصلی");
    formData.set("isSelected", "true");
    formData.set("distanceKm", "15.0");
    formData.set("estimatedDurationMinute", "30");
    // Existing point
    formData.set("point.0.locationId", "10");
    formData.set("point.0.sequenceNo", "1");
    // Newly added point
    formData.set("point.1.locationId", "20");
    formData.set("point.1.sequenceNo", "2");
    formData.set("point.1.description", "نقطه دوم جدید");

    const result = await addTripRouteAction(100, {}, formData);

    // Verifies saveRoute was called with routeId: 501, preserving the same route row
    expect(mockSaveRoute).toHaveBeenCalledWith({
      routeId: 501,
      tripId: 701,
      tripExecutionId: null,
      routeName: "مسیر اصلی",
      alternativeNo: null,
      distanceKm: "15.0",
      estimatedDurationMinute: 30,
      isSelected: true,
      description: null,
      points: [
        {
          locationId: 10,
          trafficZone: null,
          sequenceNo: 1,
          distanceFromStartKm: null,
          description: null,
        },
        {
          locationId: 20,
          trafficZone: null,
          sequenceNo: 2,
          distanceFromStartKm: null,
          description: "نقطه دوم جدید",
        },
      ],
    });

    expect(revalidatePath).toHaveBeenCalledWith("/trips/100");
    expect(result).toEqual({ success: true });
  });

  it("2. Creating a new route (without routeId) passes routeId: null to saveRoute and returns success", async () => {
    mockSaveRoute.mockResolvedValue({
      success: true,
      id: 601,
    });

    const formData = new FormData();
    formData.set("tripId", "701");
    formData.set("routeName", "مسیر جدید پیشنهادی");
    formData.set("isSelected", "true");
    formData.set("distanceKm", "12.5");
    formData.set("estimatedDurationMinute", "25");
    formData.set("point.0.locationId", "10");
    formData.set("point.0.sequenceNo", "1");
    formData.set("point.1.locationId", "20");
    formData.set("point.1.sequenceNo", "2");

    const result = await addTripRouteAction(100, {}, formData);

    expect(mockSaveRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: null,
        tripId: 701,
        routeName: "مسیر جدید پیشنهادی",
      }),
    );

    expect(revalidatePath).toHaveBeenCalledWith("/trips/100");
    expect(result).toEqual({ success: true });
  });

  it("3. Deleting a route: calls deleteRoute with routeId and tripRequestId", async () => {
    mockDeleteRoute.mockResolvedValue({
      success: true,
      id: 501,
    });

    const result = await deleteTripRouteAction(100, 501, {});

    expect(mockDeleteRoute).toHaveBeenCalledWith({
      tripRequestId: 100,
      routeId: 501,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/trips/100");
    expect(result).toEqual({ success: true });
  });

  it("4. Deleting a route failure: returns failure error if service rejects deletion", async () => {
    mockDeleteRoute.mockResolvedValue({
      success: false,
      error: "REQUEST_TERMINAL",
    });

    const result = await deleteTripRouteAction(100, 501, {});

    expect(mockDeleteRoute).toHaveBeenCalledWith({
      tripRequestId: 100,
      routeId: 501,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: "REQUEST_TERMINAL",
      values: {},
    });
  });
});
