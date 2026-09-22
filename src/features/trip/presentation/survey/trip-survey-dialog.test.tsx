import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  TripExecutionRecord,
  TripPersonReference,
} from "../../application/trip-records";
import { TripSurveyDialog } from "./trip-survey-dialog";

vi.mock("@/components/ui/dialog/dialog", () =>
  import("../../../../components/ui/dialog/dialog"),
);
vi.mock("@/components/ui/action-button/action-button", () =>
  import("../../../../components/ui/action-button/action-button"),
);
vi.mock("@/components/ui/form-field/form-field", () =>
  import("../../../../components/ui/form-field/form-field"),
);
vi.mock("@/components/ui/inline-notice/inline-notice", () =>
  import("../../../../components/ui/inline-notice/inline-notice"),
);
vi.mock("@/components/ui/status-badge/status-badge", () =>
  import("../../../../components/ui/status-badge/status-badge"),
);
vi.mock("@/components/ui/technical-value/technical-value", () =>
  import("../../../../components/ui/technical-value/technical-value"),
);
vi.mock("../trip.actions", () => ({
  savePassengerSurveyAction: vi.fn(),
}));

const passenger: TripPersonReference = {
  personId: 10,
  firstName: "مریم",
  lastName: "سعیدی",
  personnelNo: "EMP-42",
  nationalCode: null,
  mobile: "09121234567",
  isActive: true,
};

const execution: TripExecutionRecord = {
  tripExecutionId: 101,
  tripId: 50,
  assignment: {
    assignmentId: 1,
    fromDateTime: new Date("2026-03-22T04:30:00Z"),
    toDateTime: null,
    driverId: 5,
    driverFirstName: "رضا",
    driverLastName: "راننده",
    driverPersonnelNo: "DRV-1",
    driverIsActive: true,
    hasEligibleLicense: true,
    vehicle: {
      vehicleId: 1,
      vehicleCode: "V-100",
      plateNoLeftSide: "12",
      plateNoCenterChar: "ب",
      plateNoRightSide: "345",
      plateNoIranNo: "77",
      brandName: "Brand",
      modelName: "Model",
      vehicleTypeName: "سواری",
      vehicleStatusName: "فعال",
      isActive: true,
    },
  },
  actualPickupDateTime: new Date("2026-03-22T05:00:00Z"),
  actualDropoffDateTime: new Date("2026-03-22T07:30:00Z"),
  startOdometer: "1200",
  endOdometer: "1280",
  status: "Completed",
  passengerRating: 5,
  passengerComment: "سفر بسیار عالی و به موقع انجام شد.",
  surveyDateTime: new Date("2026-03-22T08:00:00Z"),
  description: null,
  createdAt: new Date("2026-03-22T04:00:00Z"),
  routes: [],
};

describe("TripSurveyDialog", () => {
  it("renders passenger identity, rating chips, and comment for recorded survey", () => {
    const markup = renderToStaticMarkup(
      <TripSurveyDialog
        tripRequestId={1}
        passenger={passenger}
        execution={execution}
        open={true}
        onClose={vi.fn()}
      />,
    );

    // Passenger context bar
    expect(markup).toContain("مریم سعیدی");
    expect(markup).toContain("EMP-42");
    expect(markup).toContain("نظرسنجی ثبت‌شده");

    // Redesigned rating section
    expect(markup).toContain("امتیاز مسافر به کیفیت سفر (۱ تا ۵)");
    expect(markup).toContain("خیلی ضعیف");
    expect(markup).toContain("ضعیف");
    expect(markup).toContain("متوسط");
    expect(markup).toContain("خوب");
    expect(markup).toContain("عالی");
    expect(markup).toContain("پاک کردن امتیاز");

    // Comment and submit actions
    expect(markup).toContain("سفر بسیار عالی و به موقع انجام شد.");
    expect(markup).toContain("ذخیره تغییرات");
  });

  it("renders pending state with ثبت نظرسنجی when not recorded yet", () => {
    const unrecorded: TripExecutionRecord = {
      ...execution,
      passengerRating: null,
      passengerComment: null,
      surveyDateTime: null,
    };

    const markup = renderToStaticMarkup(
      <TripSurveyDialog
        tripRequestId={1}
        passenger={passenger}
        execution={unrecorded}
        open={true}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain("در انتظار ثبت");
    expect(markup).toContain("ثبت نظرسنجی");
    expect(markup).not.toContain("پاک کردن امتیاز");
  });
});
