import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type {
  TripExecutionRecord,
  TripPassengerRecord,
} from "../../application/trip-records";
import { TripCompletionDialog } from "./trip-completion-dialog";
import { TripExecutionForm } from "./trip-execution-form";

// Mocks
vi.mock("@/components/ui/dialog/dialog", () =>
  import("../../../../components/ui/dialog/dialog"),
);
vi.mock("@/components/ui/action-button/action-button", () =>
  import("../../../../components/ui/action-button/action-button"),
);
vi.mock("@/components/ui/form-field/form-field", () =>
  import("../../../../components/ui/form-field/form-field"),
);
vi.mock("@/components/ui/confirm-dialog/confirm-dialog", () =>
  import("../../../../components/ui/confirm-dialog/confirm-dialog"),
);
vi.mock("@/components/ui/inline-notice/inline-notice", () =>
  import("../../../../components/ui/inline-notice/inline-notice"),
);
vi.mock("@/components/ui/status-badge/status-badge", () =>
  import("../../../../components/ui/status-badge/status-badge"),
);
vi.mock("@/components/ui/date-picker/jalali-date-picker", () => ({
  JalaliDatePicker: ({
    name,
    label,
    defaultValue,
  }: {
    name: string;
    label: string;
    defaultValue?: string;
  }) => (
    <div data-testid={`datepicker-${name}`}>
      <label>{label}</label>
      <input name={name} defaultValue={defaultValue} />
    </div>
  ),
}));
vi.mock("@/components/ui/time-select/time-select", () => ({
  TimeSelect: ({
    name,
    label,
    defaultValue,
  }: {
    name: string;
    label: string;
    defaultValue?: string;
  }) => (
    <div data-testid={`timeselect-${name}`}>
      <label>{label}</label>
      <input name={name} defaultValue={defaultValue} />
    </div>
  ),
}));
vi.mock("../trip.actions", () => ({
  saveTripExecutionAction: vi.fn(),
}));

const mockPassenger1: TripPassengerRecord = {
  tripId: 101,
  passengerPersonId: 1,
  passenger: {
    personId: 1,
    firstName: "علی",
    lastName: "محمدی",
    personnelNo: "EMP-100",
    mobile: "09120000000",
    isActive: true,
  },
  originLocationId: 10,
  origin: {
    locationId: 10,
    locationCode: "LOC-1",
    locationName: "دفتر مرکزی",
    locationType: "اداری",
    address: null,
    isActive: true,
  },
  destinationLocationId: 20,
  destination: {
    locationId: 20,
    locationCode: "LOC-2",
    locationName: "کارخانه شماره ۱",
    locationType: "صنعتی",
    address: null,
    isActive: true,
  },
  requestedPickupDateTime: new Date("2026-03-22T04:30:00Z"),
  pickupOrder: 1,
  dropoffOrder: 1,
  status: "Assigned",
  description: null,
  routes: [],
  executions: [
    {
      tripExecutionId: 201,
      tripId: 101,
      startOdometer: "125000",
      endOdometer: "125045",
      actualPickupDateTime: new Date("2026-03-22T04:35:00Z"),
      actualDropoffDateTime: new Date("2026-03-22T05:30:00Z"),
      status: "InProgress",
      description: "برگشت طبق برنامه انجام شد",
      passengerRating: null,
      passengerComment: null,
      surveyDateTime: null,
      createdAt: new Date("2026-03-22T00:00:00Z"),
      routes: [],
      assignment: {
        assignmentId: 301,
        fromDateTime: new Date("2026-03-22T00:00:00Z"),
        toDateTime: null,
        driverId: 50,
        driverFirstName: "رضا",
        driverLastName: "حسینی",
        driverPersonnelNo: "DRV-50",
        driverIsActive: true,
        hasEligibleLicense: true,
        vehicle: {
          vehicleId: 60,
          vehicleCode: "VEH-60",
          plateNoLeftSide: "12",
          plateNoCenterChar: "ب",
          plateNoRightSide: "345",
          plateNoIranNo: "77",
          brandName: "پژو",
          modelName: "پارس",
          vehicleTypeName: "سواری",
          vehicleStatusName: "فعال",
          isActive: true,
        },
      },
    },
  ],
};

describe("TripExecutionForm", () => {
  it("renders the 4 logical groups with corrected passenger pickup and dropoff legends", () => {
    const activeExecution = mockPassenger1.executions[0] as TripExecutionRecord;
    const markup = renderToStaticMarkup(
      <TripExecutionForm
        tripRequestId={1}
        trip={mockPassenger1}
        execution={activeExecution}
        onCancel={() => {}}
      />,
    );

    expect(markup).toContain("سوارشدن مسافر");
    expect(markup).toContain("پیاده‌شدن مسافر");
    expect(markup).toContain("کیلومترشمار");
    expect(markup).toContain("وضعیت و توضیحات");
    expect(markup).not.toContain("اطلاعات بازگشت");
  });

  it("renders the compact top context bar and read-only planned pickup time without copying to actual pickup", () => {
    const activeExecution = mockPassenger1.executions[0] as TripExecutionRecord;
    const markup = renderToStaticMarkup(
      <TripExecutionForm
        tripRequestId={1}
        trip={mockPassenger1}
        execution={activeExecution}
        onCancel={() => {}}
      />,
    );

    expect(markup).toContain("علی محمدی");
    expect(markup).toContain("EMP-100");
    expect(markup).toContain("رضا حسینی");
    expect(markup).toContain("کد VEH-60");
    expect(markup).toContain("در حال اجرا");
    expect(markup).toContain("زمان برنامه‌ریزی‌شدهٔ سوارشدن");
  });

  it("renders corrected labels for pickup, dropoff, and vehicle odometers with prefilled values", () => {
    const activeExecution = mockPassenger1.executions[0] as TripExecutionRecord;
    const markup = renderToStaticMarkup(
      <TripExecutionForm
        tripRequestId={1}
        trip={mockPassenger1}
        execution={activeExecution}
        onCancel={() => {}}
      />,
    );

    expect(markup).toContain("تاریخ واقعی سوارشدن");
    expect(markup).toContain("ساعت واقعی سوارشدن");
    expect(markup).toContain("تاریخ واقعی پیاده‌شدن");
    expect(markup).toContain("ساعت واقعی پیاده‌شدن");
    expect(markup).toContain("کیلومتر خودرو در شروع اجرا");
    expect(markup).toContain("کیلومتر خودرو در پایان اجرا");
    expect(markup).toContain('value="125000"');
    expect(markup).toContain('value="125045"');
    expect(markup).toContain("برگشت طبق برنامه انجام شد");
    expect(markup).toContain("انصراف");
    expect(markup).toContain("ثبت و ذخیره اطلاعات");
  });

  it("hydrates with empty actual pickup when actualPickupDateTime is null without copying requestedPickupDateTime", () => {
    const executionWithoutPickup: TripExecutionRecord = {
      ...mockPassenger1.executions[0]!,
      actualPickupDateTime: null,
      actualDropoffDateTime: new Date("2026-03-22T05:30:00Z"),
    };

    const markup = renderToStaticMarkup(
      <TripExecutionForm
        tripRequestId={1}
        trip={mockPassenger1}
        execution={executionWithoutPickup}
        onCancel={() => {}}
      />,
    );

    // Actual pickup inputs are empty
    expect(markup).toContain('name="actualPickupDay" value=""');
    expect(markup).toContain('name="actualPickupTime" value=""');
    // Dropoff is hydrated
    expect(markup).toContain('name="actualDropoffDay" value="2026-03-22"');
    // Read-only context is still displayed
    expect(markup).toContain("زمان برنامه‌ریزی‌شدهٔ سوارشدن");
  });
});

describe("TripCompletionDialog", () => {
  it("renders with size=list and multi-passenger switcher when multiple passengers exist", () => {
    const passenger2: TripPassengerRecord = {
      ...mockPassenger1,
      tripId: 102,
      passengerPersonId: 2,
      passenger: {
        ...mockPassenger1.passenger,
        personId: 2,
        firstName: "سارا",
        lastName: "احمدی",
      },
    };

    const markup = renderToStaticMarkup(
      <TripCompletionDialog
        tripRequestId={1}
        open={true}
        onClose={() => {}}
        passengers={[mockPassenger1, passenger2]}
      />,
    );

    expect(markup).toContain("ثبت / ویرایش اطلاعات اجرای مسافران");
    expect(markup).toContain("انتخاب مسافر");
    expect(markup).toContain("علی محمدی");
    expect(markup).toContain("سارا احمدی");
    expect(markup).toContain("list"); // Dialog size class
  });
});
