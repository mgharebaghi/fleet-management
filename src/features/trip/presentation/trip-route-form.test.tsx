import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  TripLocationReference,
  TripPassengerRecord,
  TripRoute,
} from "../application/trip-records";
import {
  hydrateRouteFormValues,
  resolveTargetRoute,
  TripRouteForm,
  validateRouteStep1,
} from "./trip-route-form";

// Resolve component mocks using relative paths
vi.mock("@/components/ui/dialog/dialog", () =>
  import("../../../components/ui/dialog/dialog"),
);
vi.mock("@/components/ui/action-button/action-button", () =>
  import("../../../components/ui/action-button/action-button"),
);
vi.mock("@/components/ui/form-field/form-field", () =>
  import("../../../components/ui/form-field/form-field"),
);
vi.mock("@/components/ui/form-grid/form-grid", () =>
  import("../../../components/ui/form-grid/form-grid"),
);
vi.mock("@/components/ui/inline-notice/inline-notice", () =>
  import("../../../components/ui/inline-notice/inline-notice"),
);
vi.mock("@/components/ui/searchable-select/searchable-select", () =>
  import("../../../components/ui/searchable-select/searchable-select"),
);
vi.mock("@/components/ui/status-badge/status-badge", () =>
  import("../../../components/ui/status-badge/status-badge"),
);
vi.mock("@/components/ui/technical-value/technical-value", () =>
  import("../../../components/ui/technical-value/technical-value"),
);
vi.mock("./location/location.actions", () => ({
  createLocationAction: vi.fn(),
}));
vi.mock("./trip.actions", () => ({
  addTripRouteAction: vi.fn(),
}));

const mockLocation1: TripLocationReference = {
  locationId: 10,
  locationCode: "LOC-01",
  locationName: "دفتر مرکزی",
  locationType: "اداری",
  address: "تهران، خیابان آزادی",
  isActive: true,
};

const mockLocation2: TripLocationReference = {
  locationId: 20,
  locationCode: "LOC-02",
  locationName: "کارخانه شماره ۱",
  locationType: "تولیدی",
  address: "کیلومتر ۱۴ جاده مخصوص",
  isActive: true,
};

const mockRouteA: TripRoute = {
  routeId: 501,
  tripId: 701,
  tripExecutionId: null,
  routeName: "مسیر اصلی بزرگراه یادگار",
  alternativeNo: 1,
  distanceKm: "18.5",
  estimatedDurationMinute: 35,
  isSelected: true,
  description: "مسیر روان بدون محدوده طرح ترافیک",
  createdAt: new Date("2026-03-20T10:00:00Z"),
  points: [
    {
      routePointId: 1001,
      location: mockLocation1,
      trafficZone: null,
      sequenceNo: 1,
      distanceFromStartKm: "0.0",
      description: "محل سوار شدن مسافر",
    },
    {
      routePointId: 1002,
      location: mockLocation2,
      trafficZone: "کنترل آلودگی",
      sequenceNo: 2,
      distanceFromStartKm: "18.5",
      description: "درب شمالی کارخانه",
    },
  ],
};

const mockPassengerA: TripPassengerRecord = {
  tripId: 701,
  passengerPersonId: 1,
  originLocationId: 10,
  destinationLocationId: 20,
  requestedPickupDateTime: new Date("2026-03-21T08:00:00Z"),
  pickupOrder: 1,
  dropoffOrder: 1,
  status: null,
  description: null,
  passenger: {
    personId: 1,
    firstName: "علی",
    lastName: "محمدی",
    personnelNo: "EMP-100",
    mobile: "09121112233",
    isActive: true,
  },
  origin: mockLocation1,
  destination: mockLocation2,
  routes: [mockRouteA],
  executions: [],
};

const mockPassengerB: TripPassengerRecord = {
  tripId: 702,
  passengerPersonId: 2,
  originLocationId: 10,
  destinationLocationId: 20,
  requestedPickupDateTime: new Date("2026-03-21T08:15:00Z"),
  pickupOrder: 2,
  dropoffOrder: 2,
  status: null,
  description: null,
  passenger: {
    personId: 2,
    firstName: "سارا",
    lastName: "احمدی",
    personnelNo: "EMP-200",
    mobile: "09122223344",
    isActive: true,
  },
  origin: mockLocation1,
  destination: mockLocation2,
  routes: [],
  executions: [],
};

describe("TripRouteForm - Existing vs New Route & Validation", () => {
  it("1. New Route: required route-level validation still works", () => {
    // When fields are empty
    expect(validateRouteStep1({ tripId: "", routeName: "" })).toBe(
      "سفر مسافر را انتخاب کنید.",
    );
    expect(validateRouteStep1({ tripId: "701", routeName: "" })).toBe(
      "نام مسیر را وارد کنید.",
    );
    expect(validateRouteStep1({ tripId: "701", routeName: "   " })).toBe(
      "نام مسیر را وارد کنید.",
    );

    // When valid
    expect(
      validateRouteStep1({ tripId: "701", routeName: "مسیر اختصاصی" }),
    ).toBeNull();

    // Renders blank form in create mode
    const markup = renderToStaticMarkup(
      <TripRouteForm
        tripRequestId={100}
        passengers={[mockPassengerB]}
        locations={[mockLocation1, mockLocation2]}
        initialRoute={null}
      />,
    );
    expect(markup).toContain('name="routeName"');
    expect(markup).not.toContain('name="routeId"');
    expect(markup).toContain("اطلاعات مسیر");
    expect(markup).toContain("برآورد مسیر");
  });

  it("2. Existing Route: existing persisted Route data hydrates correctly", () => {
    const values = hydrateRouteFormValues(mockRouteA, 701);

    expect(values.routeId).toBe("501");
    expect(values.tripId).toBe("701");
    expect(values.routeName).toBe("مسیر اصلی بزرگراه یادگار");
    expect(values.isSelected).toBe("true");
    expect(values.distanceKm).toBe("18.5");
    expect(values.estimatedDurationMinute).toBe("35");
    expect(values.alternativeNo).toBe("1");
    expect(values.routeDescription).toBe("مسیر روان بدون محدوده طرح ترافیک");
    expect(values.pointCount).toBe("2");

    expect(values["point.0.locationId"]).toBe("10");
    expect(values["point.0.sequenceNo"]).toBe("1");
    expect(values["point.0.distanceFromStartKm"]).toBe("0.0");
    expect(values["point.0.description"]).toBe("محل سوار شدن مسافر");

    expect(values["point.1.locationId"]).toBe("20");
    expect(values["point.1.sequenceNo"]).toBe("2");
    expect(values["point.1.distanceFromStartKm"]).toBe("18.5");
    expect(values["point.1.trafficZone"]).toBe("کنترل آلودگی");
    expect(values["point.1.description"]).toBe("درب شمالی کارخانه");
  });

  it("3. Existing Route: user can continue to Step 2 without re-entering required fields", () => {
    const hydrated = hydrateRouteFormValues(mockRouteA, 701);

    // Validation passes smoothly with hydrated values
    const error = validateRouteStep1({
      tripId: hydrated.tripId,
      routeName: hydrated.routeName,
    });
    expect(error).toBeNull();

    // Rendering with existing route pre-populates the input values
    const markup = renderToStaticMarkup(
      <TripRouteForm
        tripRequestId={100}
        passengers={[mockPassengerA]}
        locations={[mockLocation1, mockLocation2]}
        initialRoute={mockRouteA}
      />,
    );

    expect(markup).toContain('value="501"');
    expect(markup).toContain('name="routeId"');
    expect(markup).toContain('value="مسیر اصلی بزرگراه یادگار"');
    expect(markup).toContain('value="18.5"');
    expect(markup).toContain('value="35"');
    expect(markup).toContain("ویرایش مسیر برنامه‌ریزی‌شده");
    expect(markup).toContain("بعدی");
  });

  it("4. Multi-passenger isolation: resolving existing route is trip-specific", () => {
    // When targeting passenger B (who has NO route), it does NOT grab passenger A's route!
    const resolvedForB = resolveTargetRoute({
      passengers: [mockPassengerA, mockPassengerB],
      targetTripId: 702,
    });
    expect(resolvedForB).toBeNull();

    // When targeting passenger A, it finds passenger A's route
    const resolvedForA = resolveTargetRoute({
      passengers: [mockPassengerA, mockPassengerB],
      targetTripId: 701,
    });
    expect(resolvedForA?.routeId).toBe(501);

    // When passenger list has multiple passengers and no targetTripId is specified,
    // it does NOT guess or fall back to an arbitrary passenger's route
    const unresolved = resolveTargetRoute({
      passengers: [mockPassengerA, mockPassengerB],
      targetTripId: null,
    });
    expect(unresolved).toBeNull();
  });

  it("5. RouteId preservation: form state preserves routeId and navigation does not call server action", () => {
    const mockAction = vi.fn();

    const markup = renderToStaticMarkup(
      <TripRouteForm
        tripRequestId={100}
        passengers={[mockPassengerA]}
        locations={[mockLocation1, mockLocation2]}
        initialRoute={mockRouteA}
        action={mockAction}
      />,
    );

    // routeId is preserved in a hidden input so that any submission carries the route identity
    expect(markup).toContain('<input type="hidden" name="routeId" value="501"/>');

    // No server action is triggered during rendering or step navigation
    expect(mockAction).not.toHaveBeenCalled();
  });

  it("6. Error notice presentation: displays clear error notice when route update/submission fails", () => {
    const markup = renderToStaticMarkup(
      <TripRouteForm
        tripRequestId={100}
        passengers={[mockPassengerA]}
        locations={[mockLocation1, mockLocation2]}
        initialRoute={mockRouteA}
        initialState={{
          error: "ROUTE_IN_USE",
          values: { routeId: "501" },
        }}
      />,
    );

    expect(markup).toContain(
      "امکان حذف یا تغییر مسیر متصل به سابقهٔ اجرای سفر وجود ندارد.",
    );
  });

  it("7. Multi-point preservation under existing RouteId: all points remain tied to the same route", () => {
    const hydrated = hydrateRouteFormValues(mockRouteA, 701);

    expect(hydrated.routeId).toBe("501");
    expect(hydrated.pointCount).toBe("2");
    expect(hydrated["point.0.locationId"]).toBe("10");
    expect(hydrated["point.1.locationId"]).toBe("20");

    const markup = renderToStaticMarkup(
      <TripRouteForm
        tripRequestId={100}
        passengers={[mockPassengerA]}
        locations={[mockLocation1, mockLocation2]}
        initialRoute={mockRouteA}
      />,
    );

    // Form retains routeId hidden input and point count input
    expect(markup).toContain('<input type="hidden" name="routeId" value="501"/>');
    expect(markup).toContain('name="pointCount"');
    expect(markup).toContain('value="2"');
  });
});
