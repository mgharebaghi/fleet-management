import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { TripRoute } from "../../application/trip-records";
import { RouteCard, togglePointsDisclosure } from "./trip-route-card";

vi.mock("@/components/ui/status-badge/status-badge", () =>
  import("../../../../components/ui/status-badge/status-badge"),
);
vi.mock("@/components/ui/technical-value/technical-value", () =>
  import("../../../../components/ui/technical-value/technical-value"),
);
vi.mock("@/components/ui/icon-action-button/icon-action-button", () =>
  import("../../../../components/ui/icon-action-button/icon-action-button"),
);
vi.mock("@/components/ui/icon/icons", () =>
  import("../../../../components/ui/icon/icons"),
);
vi.mock("../route/trip-route-dialog", () => ({
  TripRouteDialog: vi.fn(({ triggerLabel }) => (
    <button data-testid="edit-dialog" aria-label={triggerLabel ?? "ویرایش مسیر"}>
      {triggerLabel ?? "ویرایش مسیر"}
    </button>
  )),
}));
vi.mock("../route/delete-route-dialog", () => ({
  DeleteRouteButton: vi.fn(() => (
    <button data-testid="delete-dialog" aria-label="حذف مسیر">
      حذف مسیر
    </button>
  )),
}));

const samplePoints = [
  {
    routePointId: 1,
    routeId: 10,
    sequenceNo: 1,
    location: {
      locationId: 101,
      locationCode: "LOC-1",
      locationName: "مبدأ سازمان",
      locationType: "اداری",
      address: null,
      isActive: true,
    },
    distanceFromStartKm: null,
    trafficZone: null,
    description: null,
  },
  {
    routePointId: 2,
    routeId: 10,
    sequenceNo: 2,
    location: {
      locationId: 102,
      locationCode: "LOC-2",
      locationName: "میدان آزادی",
      locationType: "میدان",
      address: null,
      isActive: true,
    },
    distanceFromStartKm: "8.5",
    trafficZone: "طرح ترافیک",
    description: "توقف کوتاه",
  },
  {
    routePointId: 3,
    routeId: 10,
    sequenceNo: 3,
    location: {
      locationId: 103,
      locationCode: "LOC-3",
      locationName: "مقصد فرودگاه",
      locationType: "فرودگاه",
      address: null,
      isActive: true,
    },
    distanceFromStartKm: "25",
    trafficZone: null,
    description: null,
  },
];

const sampleRoute: TripRoute = {
  routeId: 10,
  tripId: 1,
  tripExecutionId: null,
  routeName: "مسیر اصلی فرودگاه",
  alternativeNo: null,
  distanceKm: "25",
  estimatedDurationMinute: 40,
  isSelected: true,
  description: "مسیر ترجیحی اتوبان",
  createdAt: new Date(),
  points: samplePoints,
};

describe("RouteCard component presentation", () => {
  it("shows compact empty state when a route has zero points", () => {
    const routeWithNoPoints: TripRoute = {
      ...sampleRoute,
      points: [],
    };

    const markup = renderToStaticMarkup(
      <RouteCard route={routeWithNoPoints} />,
    );

    expect(markup).toContain("نقطه‌ای برای این مسیر ثبت نشده است.");
    expect(markup).not.toContain("نمایش نقاط");
    expect(markup).not.toContain("نقاط مسیر");
  });

  it("keeps route points collapsed by default and shows summary toggle badge", () => {
    const markup = renderToStaticMarkup(
      <RouteCard route={sampleRoute} />,
    );

    expect(markup).toContain("نقاط مسیر");
    expect(markup).toContain("3 نقطه");
    expect(markup).toContain("نمایش نقاط ▾");
    expect(markup).toContain('aria-expanded="false"');

    // Points themselves are collapsed and not in DOM
    expect(markup).not.toContain("میدان آزادی");
    expect(markup).not.toContain("طرح ترافیک");
    expect(markup).not.toContain("توقف کوتاه");
    expect(markup).not.toContain("مقصد فرودگاه");
  });

  it("reveals ordered points when expanded", () => {
    const markup = renderToStaticMarkup(
      <RouteCard route={sampleRoute} defaultPointsOpen={true} />,
    );

    expect(markup).toContain("بستن نقاط ▴");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("مبدأ سازمان");
    expect(markup).toContain("میدان آزادی");
    expect(markup).toContain("طرح ترافیک");
    expect(markup).toContain("8.5 کیلومتر از شروع");
    expect(markup).toContain("توقف کوتاه");
    expect(markup).toContain("مقصد فرودگاه");
  });

  it("togglePointsDisclosure pure logic correctly inverts disclosure state", () => {
    expect(togglePointsDisclosure(false)).toBe(true);
    expect(togglePointsDisclosure(true)).toBe(false);
  });

  it("supports multiple routes being independently collapsed or expanded", () => {
    const routeA: TripRoute = {
      ...sampleRoute,
      routeId: 101,
      routeName: "مسیر اول",
    };
    const routeB: TripRoute = {
      ...sampleRoute,
      routeId: 102,
      routeName: "مسیر دوم",
      isSelected: false,
      alternativeNo: 1,
    };

    const markupA = renderToStaticMarkup(
      <RouteCard route={routeA} defaultPointsOpen={true} />,
    );
    const markupB = renderToStaticMarkup(
      <RouteCard route={routeB} defaultPointsOpen={false} />,
    );

    // Route A is expanded
    expect(markupA).toContain("مسیر اول");
    expect(markupA).toContain("میدان آزادی");
    expect(markupA).toContain("بستن نقاط ▴");

    // Route B is collapsed
    expect(markupB).toContain("مسیر دوم");
    expect(markupB).not.toContain("میدان آزادی");
    expect(markupB).toContain("نمایش نقاط ▾");
  });

  it("visually distinguishes selected route from alternative route", () => {
    const selectedMarkup = renderToStaticMarkup(
      <RouteCard route={sampleRoute} />,
    );
    expect(selectedMarkup).toContain("routeCardSelected");
    expect(selectedMarkup).toContain("مسیر انتخاب‌شده");
    expect(selectedMarkup).not.toContain("شماره جایگزین");

    const alternativeRoute: TripRoute = {
      ...sampleRoute,
      isSelected: false,
      alternativeNo: 2,
    };
    const alternativeMarkup = renderToStaticMarkup(
      <RouteCard route={alternativeRoute} />,
    );
    expect(alternativeMarkup).not.toContain("routeCardSelected");
    expect(alternativeMarkup).toContain("مسیر جایگزین");
    expect(alternativeMarkup).toContain("شماره جایگزین:");
    expect(alternativeMarkup).toContain("2");
  });

  it("renders compact edit and delete actions when planning is not frozen", () => {
    const markup = renderToStaticMarkup(
      <RouteCard
        route={sampleRoute}
        tripRequestId={44}
        passengers={[]}
        locations={[]}
        isPlanningFrozen={false}
      />,
    );

    expect(markup).toContain("ویرایش مسیر");
    expect(markup).toContain("حذف مسیر");
  });

  it("omits edit and delete actions when planning is frozen", () => {
    const markup = renderToStaticMarkup(
      <RouteCard
        route={sampleRoute}
        tripRequestId={44}
        passengers={[]}
        locations={[]}
        isPlanningFrozen={true}
      />,
    );

    expect(markup).not.toContain("ویرایش مسیر");
    expect(markup).not.toContain("حذف مسیر");
  });
});
