import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  TripAssignmentReference,
  TripLocationReference,
  TripRequestDetails,
} from "../../application/trip-records";
import { TripRequestHandlingPage } from "./trip-request-handling-page";

vi.mock("@/components/ui/back-link/back-link", () =>
  import("../../../../components/ui/back-link/back-link"),
);
vi.mock("@/components/ui/page-shell/page-shell", () =>
  import("../../../../components/ui/page-shell/page-shell"),
);
vi.mock("@/components/ui/page-header/page-header", () =>
  import("../../../../components/ui/page-header/page-header"),
);
vi.mock("@/components/ui/status-badge/status-badge", () =>
  import("../../../../components/ui/status-badge/status-badge"),
);
vi.mock("@/components/ui/technical-value/technical-value", () =>
  import("../../../../components/ui/technical-value/technical-value"),
);
vi.mock("@/components/ui/action-button/action-button", () =>
  import("../../../../components/ui/action-button/action-button"),
);
vi.mock("@/components/ui/icon-action-button/icon-action-button", () =>
  import("../../../../components/ui/icon-action-button/icon-action-button"),
);
vi.mock("@/components/ui/icon/icons", () =>
  import("../../../../components/ui/icon/icons"),
);
vi.mock("@/components/ui/action-link/action-link", () =>
  import("../../../../components/ui/action-link/action-link"),
);
vi.mock("@/components/ui/form-field/form-field", () =>
  import("../../../../components/ui/form-field/form-field"),
);
vi.mock("@/components/ui/inline-notice/inline-notice", () =>
  import("../../../../components/ui/inline-notice/inline-notice"),
);
vi.mock("@/components/ui/searchable-select/searchable-select", () =>
  import("../../../../components/ui/searchable-select/searchable-select"),
);
vi.mock("@/components/ui/vehicle-plate/vehicle-plate", () =>
  import("../../../../components/ui/vehicle-plate/vehicle-plate"),
);
vi.mock("@/components/ui/wizard-progress/wizard-progress", () =>
  import("../../../../components/ui/wizard-progress/wizard-progress"),
);
vi.mock("@/components/ui/dialog/dialog", () =>
  import("../../../../components/ui/dialog/dialog"),
);
vi.mock("@/components/ui/form-grid/form-grid", () =>
  import("../../../../components/ui/form-grid/form-grid"),
);
vi.mock("../location/location.actions", () => ({
  createLocationAction: vi.fn(),
}));
vi.mock("../trip.actions", () => ({
  assignInitialTripRequestAction: vi.fn(),
}));

const mockLocation1: TripLocationReference = {
  locationId: 10,
  locationCode: "LOC-1",
  locationName: "دفتر مرکزی",
  locationType: null,
  address: "تهران، میدان ونک",
  isActive: true,
};

const mockLocation2: TripLocationReference = {
  locationId: 20,
  locationCode: "LOC-2",
  locationName: "کارخانه",
  locationType: null,
  address: "کیلومتر ۱۴ جاده مخصوص",
  isActive: true,
};

const mockVehicle = {
  vehicleId: 101,
  vehicleCode: "V-101",
  plateNoLeftSide: "12",
  plateNoCenterChar: "الف",
  plateNoRightSide: "345",
  plateNoIranNo: "67",
  brandName: "ایران خودرو",
  modelName: "دنا پلاس",
  vehicleTypeName: "سواری",
  vehicleStatusName: "فعال",
  isActive: true,
};

const mockAssignment: TripAssignmentReference = {
  assignmentId: 501,
  fromDateTime: new Date("2026-03-20T00:00:00Z"),
  toDateTime: null,
  driverId: 1,
  driverFirstName: "محمد",
  driverLastName: "راننده",
  driverPersonnelNo: "D-100",
  driverIsActive: true,
  hasEligibleLicense: true,
  vehicle: mockVehicle,
};

const mockDetails: TripRequestDetails = {
  tripRequestId: 42,
  requestNo: "TR-1405-0042",
  requestType: {
    tripRequestTypeId: 1,
    typeName: "مبدأ و مقصد مشترک",
    typeCode: "COMMON_ORIGIN_DESTINATION",
    description: null,
  },
  requestDateTime: new Date("2026-05-10T08:00:00Z"),
  requestedTravelDateTime: new Date("2026-05-11T10:00:00Z"),
  purpose: "بازدید فنی از کارخانه",
  status: "New",
  description: "جلسه با مدیران تولید",
  createdAt: new Date("2026-05-10T08:00:00Z"),
  passengers: [
    {
      tripId: 1001,
      passengerPersonId: 201,
      originLocationId: 10,
      destinationLocationId: 20,
      requestedPickupDateTime: null,
      pickupOrder: 1,
      dropoffOrder: 1,
      status: null,
      description: "مسافر اول",
      passenger: {
        personId: 201,
        firstName: "علی",
        lastName: "رضایی",
        personnelNo: "EMP-01",        nationalCode: null,        mobile: "09120000001",
        isActive: true,
      },
      origin: mockLocation1,
      destination: mockLocation2,
      routes: [],
      executions: [],
    },
    {
      tripId: 1002,
      passengerPersonId: 202,
      originLocationId: 10,
      destinationLocationId: 20,
      requestedPickupDateTime: null,
      pickupOrder: 2,
      dropoffOrder: 2,
      status: null,
      description: null,
      passenger: {
        personId: 202,
        firstName: "سارا",
        lastName: "محمدی",
        personnelNo: "EMP-02",        nationalCode: null,        mobile: "09120000002",
        isActive: true,
      },
      origin: mockLocation1,
      destination: mockLocation2,
      routes: [],
      executions: [],
    },
  ],
};

describe("TripRequestHandlingPage", () => {
  it("renders initial review step with request information and passenger table", () => {
    const markup = renderToStaticMarkup(
      <TripRequestHandlingPage
        details={mockDetails}
        locations={[mockLocation1, mockLocation2]}
        assignmentsByPassenger={{
          1001: [mockAssignment],
          1002: [mockAssignment],
        }}
        activePassengerCountsByVehicle={{}}
      />,
    );

    // Title and back link
    expect(markup).toContain("رسیدگی به درخواست TR-1405-0042");
    expect(markup).toContain('href="/trips/requests"');
    expect(markup).toContain("بازگشت به فهرست درخواست‌ها");

    // Stepper navigation
    expect(markup).toContain("بررسی درخواست");
    expect(markup).toContain("راننده و خودرو");
    expect(markup).toContain("مسیر");
    expect(markup).toContain("تأیید و تخصیص");

    // Status badge
    expect(markup).toContain("نیازمند رسیدگی");

    // Request details
    expect(markup).toContain("TR-1405-0042");
    expect(markup).toContain("مبدأ و مقصد مشترک");
    expect(markup).toContain("بازدید فنی از کارخانه");
    expect(markup).toContain("جلسه با مدیران تولید");

    // Passengers
    expect(markup).toContain("علی رضایی");
    expect(markup).toContain("EMP-01");
    expect(markup).toContain("سارا محمدی");
    expect(markup).toContain("EMP-02");
    expect(markup).toContain("دفتر مرکزی");
    expect(markup).toContain("کارخانه");

    // Action button
    expect(markup).toContain("بعدی: راننده و خودرو");
    expect(markup).toContain("انصراف و بازگشت");

    // Strictly progressive: inactive steps (like Step 4 confirmation) are not rendered on Step 1
    expect(markup).not.toContain("تأیید و تخصیص نهایی سفر");
    expect(markup).not.toContain("خلاصه برنامه و تخصیص مسافران");
  });

  it("renders correctly with single passenger without purpose or description", () => {
    const singlePassengerDetails: TripRequestDetails = {
      ...mockDetails,
      purpose: null,
      description: null,
      passengers: [mockDetails.passengers[0]],
    };

    const markup = renderToStaticMarkup(
      <TripRequestHandlingPage
        details={singlePassengerDetails}
        locations={[mockLocation1, mockLocation2]}
        assignmentsByPassenger={{
          1001: [mockAssignment],
        }}
        activePassengerCountsByVehicle={{}}
      />,
    );

    expect(markup).toContain("TR-1405-0042");
    expect(markup).toContain("1 مسافر");
    expect(markup).toContain("علی رضایی");
    expect(markup).not.toContain("سارا محمدی");
  });
});
