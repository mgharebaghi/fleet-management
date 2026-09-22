import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AssignmentStep } from "./assignment-step";
import { CreateRequestSummary } from "./create-request-summary";
import { PassengersStep } from "./passengers-step";
import { PlanningStep } from "./planning-step";
import { RequestStep } from "./request-step";
import { ReviewStep } from "./review-step";
import { RouteStep } from "./route-step";
import { TripRequestReviewDialog } from "./trip-request-review-dialog";

vi.mock("@/components/ui/action-button/action-button", () =>
  import("../../../../components/ui/action-button/action-button"),
);
vi.mock("@/components/ui/action-link/action-link", () =>
  import("../../../../components/ui/action-link/action-link"),
);
vi.mock("@/components/ui/dialog/dialog", () =>
  import("../../../../components/ui/dialog/dialog"),
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
vi.mock("@/components/ui/status-badge/status-badge", () =>
  import("../../../../components/ui/status-badge/status-badge"),
);
vi.mock("@/components/ui/technical-value/technical-value", () =>
  import("../../../../components/ui/technical-value/technical-value"),
);
vi.mock("@/components/ui/vehicle-plate/vehicle-plate", () =>
  import("../../../../components/ui/vehicle-plate/vehicle-plate"),
);
vi.mock("@/components/ui/confirm-dialog/confirm-dialog", () =>
  import("../../../../components/ui/confirm-dialog/confirm-dialog"),
);
vi.mock("@/components/ui/date-picker/jalali-date-picker", () =>
  import("../../../../components/ui/date-picker/jalali-date-picker"),
);
vi.mock("@/components/ui/form-grid/form-grid", () =>
  import("../../../../components/ui/form-grid/form-grid"),
);
vi.mock("@/components/ui/time-select/time-select", () =>
  import("../../../../components/ui/time-select/time-select"),
);
vi.mock("../location/location.actions", () => ({
  createLocationAction: vi.fn(),
}));
vi.mock("../trip.actions", () => ({
  createCompleteTripRequestAction: vi.fn(),
  addTripRouteAction: vi.fn(),
}));

const noop = () => {};

const mockLocation1 = {
  locationId: 10,
  locationCode: "LOC-1",
  locationName: "دفتر مرکزی",
  locationType: null,
  address: "تهران، میدان ونک",
  isActive: true,
};

const mockLocation2 = {
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

const mockAssignment = {
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

const mockPendingPassenger = {
  key: 0,
  personId: 1,
  personName: "رضا کریمی",
  personnelNo: "12345",
  originName: "دفتر مرکزی",
  destinationName: "کارخانه",
  requestedPickupAt: "2026-03-21T08:00:00.000Z",
  requestedPickupLabel: "۱۴۰۵/۰۱/۰۱، ۱۱:۳۰",
};

const mockReview = {
  requestTypeName: "مبدأ و مقصد مشترک",
  purpose: "جلسه ستاد",
  travelAt: "۱۴۰۵/۰۱/۰۱، ۱۱:۳۰",
  commonOriginName: "دفتر مرکزی",
  commonDestinationName: "کارخانه",
  description: "توضیحات تکمیلی",
  passengers: [{
    personName: "رضا کریمی",
    originName: "دفتر مرکزی",
    destinationName: "کارخانه",
    pickupOrder: "1",
    dropoffOrder: "1",
    description: null,
  }],
};

const mockPayload = {
  values: {
    tripRequestTypeId: "1",
    requestedTravelDay: "2026-03-21",
    requestedTravelTime: "11:30",
    "passenger.0.personId": "1",
  },
  assignments: { 0: 501 },
  routes: [],
};

describe("Trip create review dialog", () => {
  it("reviews human-readable names and submits only from confirmation", () => {
    const markup = renderToStaticMarkup(
      <TripRequestReviewDialog
        open
        titleId="review-title"
        formId="create-form"
        pending={false}
        review={{
          requestTypeName: "مبدأ و مقصد مشترک",
          purpose: "جلسه ستاد",
          travelAt: "۱۴۰۴/۰۱/۰۲، 08:00",
          commonOriginName: "تهران",
          commonDestinationName: "قم",
          description: null,
          passengers: [
            {
              personName: "علی رضایی",
              originName: "تهران",
              destinationName: "قم",
              pickupOrder: null,
              dropoffOrder: null,
              description: null,
            },
          ],
        }}
        onClose={noop}
      />,
    );

    expect(markup).toContain("مرور و تأیید درخواست سفر");
    expect(markup).toContain("<table");
    expect(markup).toContain("علی رضایی");
    expect(markup).toContain("تهران");
    expect(markup).toContain("قم");
    expect(markup).toContain("جلسه ستاد");
    expect(markup).toContain("زمان درخواست سفر");
    expect(markup).not.toContain("زمان ثبت");
    expect(markup).toContain('data-label="مسیر">تهران ← قم');
    expect(markup).not.toContain('data-label="تاریخ و ساعت سوارشدن"');
    expect(markup).not.toContain("personId");
    expect(markup).not.toContain("locationId");
    expect(markup).toContain('type="submit"');
    expect(markup).toContain('form="create-form"');
    expect(markup).toContain("تأیید و ثبت درخواست");
    expect(markup).toContain("بازگشت و ویرایش");
  });

  it("disables duplicate confirmation while the existing action is pending", () => {
    const markup = renderToStaticMarkup(
      <TripRequestReviewDialog
        open
        titleId="review-title"
        formId="create-form"
        pending
        review={{
          requestTypeName: "مبدأ و مقصد مشترک",
          purpose: null,
          travelAt: "",
          commonOriginName: null,
          commonDestinationName: null,
          description: null,
          passengers: [],
        }}
        onClose={noop}
      />,
    );

    expect(markup).toContain("در حال ثبت…");
    expect(markup).toContain("disabled");
  });
});

describe("Trip create compact summary", () => {
  it("renders only available high-level request facts", () => {
    const markup = renderToStaticMarkup(
      <CreateRequestSummary
        passengerCount={2}
        preview={{
          requestTypeName: "مبدأ و مقصد مشترک",
          purpose: "جلسه ستاد",
          travelAt: "۱۴۰۴/۰۱/۰۲، 09:30",
          originName: "تهران",
          destinationName: "قم",
          passengerCount: 1,
        }}
      />,
    );

    expect(markup).toContain('aria-label="خلاصه درخواست"');
    expect(markup).toContain("نوع درخواست");
    expect(markup).toContain("زمان درخواست سفر");
    expect(markup).toContain("مبدأ و مقصد مشترک");
    expect(markup).toContain("۱۴۰۴/۰۱/۰۲، 09:30");
    expect(markup).not.toContain("۱۴۰۴/۰۱/۰۱، 08:00");
    expect(markup).toContain("تهران ← قم");
    expect(markup).toContain("2 نفر");
    expect(markup).not.toContain("جلسه ستاد");
    expect(markup.match(/<dt>/g)).toHaveLength(4);
  });

  it("stays absent until preview data is available", () => {
    expect(
      renderToStaticMarkup(
        <CreateRequestSummary preview={null} passengerCount={1} />,
      ),
    ).toBe("");
  });
});

describe("Wizard request and passenger inputs", () => {
  it("shows only the requested travel date and time in Step 1", () => {
    const requestType = {
      tripRequestTypeId: 1,
      typeCode: "COMMON_ORIGIN_DESTINATION",
      typeName: "مبدأ و مقصد مشترک",
      description: null,
    };
    const markup = renderToStaticMarkup(
      <RequestStep
        hidden={false}
        prefix="request"
        pending={false}
        requestTypes={[requestType]}
        locations={[mockLocation1, mockLocation2]}
        selectedTypeId="1"
        typeRestoreNonce={0}
        selectedType={requestType}
        shareOrigin
        shareDestination
        state={{}}
        value={() => ""}
        fieldInvalid={() => false}
        fieldErrorId={() => undefined}
        onTypeChange={noop}
        onNext={noop}
        onCancel={noop}
      />,
    );

    expect(markup).toContain("تاریخ و زمان درخواست سفر");
    expect(markup).toContain('name="requestedTravelDay"');
    expect(markup).toContain('name="requestedTravelTime"');
    expect(markup).not.toContain('name="requestDay"');
    expect(markup).not.toContain('name="requestTime"');
  });

});

describe("Wizard Step 3: AssignmentStep", () => {
  it("uses a non-submit Previous control so returning to passengers cannot persist", () => {
    const markup = renderToStaticMarkup(
      <AssignmentStep
        hidden={false}
        passengers={[mockPendingPassenger]}
        assignmentsByPassenger={{ 0: [mockAssignment] }}
        selectedAssignments={{ 0: 501 }}
        activePassengerCountsByVehicle={{}}
        onSelectionChange={noop}
        onBack={noop}
        onNext={noop}
      />,
    );

    expect(markup).toMatch(
      /<button[^>]*type="button"[^>]*><span>قبلی<\/span><\/button>/,
    );
    expect(markup).toContain("plateWrapper");
    expect(markup).toContain("ایران");
  });
});

describe("Wizard Step 4: RouteStep", () => {
  it("renders optional route notice and action button", () => {
    const markup = renderToStaticMarkup(
      <RouteStep
        hidden={false}
        passengers={[mockPendingPassenger]}
        locations={[mockLocation1, mockLocation2]}
        routes={[]}
        onRoutesChange={noop}
        onBack={noop}
        onNext={noop}
      />,
    );

    expect(markup).toContain("مسیر سفر (اختیاری)");
    expect(markup).toContain("هنوز مسیری به برنامه اضافه نشده است");
    expect(markup).toContain("افزودن مسیر");
    expect(markup).toContain("قبلی: راننده و خودرو");
    expect(markup).toContain("بعدی: برنامه‌ریزی");
    expect(markup).toContain("افزودن مسیر برنامه‌ریزی‌شده");
    expect(markup).toContain("مشخصات مسیر");
    expect(markup).toContain("تنظیمات مسیر");
    expect(markup).toContain("توضیحات مسیر");
    expect(markup).toContain("نقاط مسیر");
    expect(markup).toContain("هنوز نقطه‌ای به مسیر اضافه نشده است.");
  });
});

describe("Wizard Step 5: PlanningStep", () => {
  it("renders pending planning and withholds voucher links until final save", () => {
    const markup = renderToStaticMarkup(
      <PlanningStep
        hidden={false}
        passengers={[mockPendingPassenger]}
        assignmentsByPassenger={{ 0: [mockAssignment] }}
        selectedAssignments={{ 0: 501 }}
        routes={[]}
        onBack={noop}
        onNext={noop}
      />,
    );

    expect(markup).toContain("برنامه‌ریزی و برگه مأموریت");
    expect(markup).toContain("برنامه‌ریزی کامل");
    expect(markup).toContain("هنوز هیچ رکوردی در پایگاه داده ایجاد نشده است");
    expect(markup).toContain("رضا کریمی");
    expect(markup).toContain("دفتر مرکزی ← کارخانه");
    expect(markup).toContain("محمد راننده");
    expect(markup).toContain("ایران خودرو دنا پلاس");
    expect(markup).toContain("plateWrapper");
    expect(markup).not.toContain('href="/trips/');
    expect(markup).toContain("پس از ثبت نهایی درخواست");
  });
});

describe("Wizard Step 6: ReviewStep", () => {
  it("renders comprehensive review and confirm action when all assigned", () => {
    const markup = renderToStaticMarkup(
      <ReviewStep
        hidden={false}
        review={mockReview}
        passengers={[mockPendingPassenger]}
        assignmentsByPassenger={{ 0: [mockAssignment] }}
        payload={mockPayload}
        onBack={noop}
      />,
    );

    expect(markup).toContain("مرور و تأیید نهایی");
    expect(markup).toContain("آماده ثبت نهایی");
    expect(markup).toContain("مبدأ و مقصد مشترک");
    expect(markup).toContain("جلسه ستاد");
    expect(markup).toContain("توضیحات تکمیلی");
    expect(markup).not.toContain("زمان ثبت درخواست");
    expect(markup).toContain("زمان درخواست سفر");
    expect(markup).toContain("رضا کریمی");
    expect(markup).toContain("محمد راننده");
    expect(markup).toContain("ایران خودرو دنا پلاس");
    expect(markup).toContain("plateWrapper");
    expect(markup).toContain('data-label="خودرو و پلاک"');
    expect(markup).toContain("با تأیید نهایی، درخواست و اطلاعات برنامه‌ریزی ثبت می‌شوند.");
    expect(markup).toContain("ثبت نهایی درخواست");
  });

  it("renders requester review mode with passenger list and submit button", () => {
    const markup = renderToStaticMarkup(
      <ReviewStep
        hidden={false}
        review={mockReview}
        formValues={{ tripRequestTypeId: "1" }}
        onBack={noop}
      />,
    );

    expect(markup).toContain("مرور و تأیید درخواست سفر");
    expect(markup).toContain("آماده ثبت درخواست");
    expect(markup).toContain("فهرست مسافران");
    expect(markup).toContain("رضا کریمی");
    expect(markup).toContain("دفتر مرکزی ← کارخانه");
    expect(markup).toContain("ثبت درخواست سفر");
    expect(markup).toContain("قبلی: مسافران");
  });
});

describe("Wizard Step 1: RequestStep", () => {
  it("offers purpose suggestions and keeps purpose as free text", () => {
    const markup = renderToStaticMarkup(
      <RequestStep
        hidden={false}
        prefix="trip-create-wizard"
        pending={false}
        requestTypes={[
          {
            tripRequestTypeId: 3,
            typeCode: "COMMON_ORIGIN_DESTINATION",
            typeName: "مبدأ و مقصد مشترک",
            description: null,
          },
        ]}
        locations={[mockLocation1]}
        selectedTypeId="3"
        typeRestoreNonce={0}
        selectedType={{
          tripRequestTypeId: 3,
          typeCode: "COMMON_ORIGIN_DESTINATION",
          typeName: "مبدأ و مقصد مشترک",
          description: null,
        }}
        shareOrigin
        shareDestination
        state={{}}
        value={(name) => (name === "purpose" ? "ماموریت اداری" : "")}
        fieldInvalid={() => false}
        fieldErrorId={() => undefined}
        onTypeChange={noop}
        onNext={noop}
      />,
    );

    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('name="purpose"');
    expect(markup).toContain('value="ماموریت اداری"');
    expect(markup).not.toContain("<datalist");
  });

  it("renders purpose error and aria-invalid when PURPOSE_TOO_LONG", () => {
    const markup = renderToStaticMarkup(
      <RequestStep
        hidden={false}
        prefix="trip-create-wizard"
        pending={false}
        requestTypes={[
          {
            tripRequestTypeId: 1,
            typeCode: "COMMON_ORIGIN",
            typeName: "مبدأ مشترک",
            description: null,
          },
        ]}
        locations={[mockLocation1]}
        selectedTypeId="1"
        typeRestoreNonce={0}
        selectedType={{
          tripRequestTypeId: 1,
          typeCode: "COMMON_ORIGIN",
          typeName: "مبدأ مشترک",
          description: null,
        }}
        shareOrigin
        shareDestination={false}
        state={{ error: "PURPOSE_TOO_LONG", field: "purpose" }}
        value={(name) => (name === "purpose" ? "الف".repeat(501) : "")}
        fieldInvalid={(name) => name === "purpose"}
        fieldErrorId={(name) =>
          name === "purpose" ? "trip-create-wizard-purpose-error" : undefined
        }
        onTypeChange={noop}
        onNext={noop}
      />,
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="trip-create-wizard-purpose-error"');
    expect(markup).toContain("هدف سفر حداکثر ۵۰۰ نویسه است.");
    expect(markup).toContain("اطلاعات اصلی");
  });

  it("renders PassengersStep with next button labeled 'بعدی: مرور و تأیید'", () => {
    const markup = renderToStaticMarkup(
      <PassengersStep
        hidden={false}
        prefix="trip-create-wizard"
        pending={false}
        people={[]}
        locations={[]}
        passengerCount={1}
        activePassengerIndex={0}
        passengerSnapshots={{}}
        shareOrigin
        shareDestination
        value={() => ""}
        fieldInvalid={() => false}
        onSelectPassenger={noop}
        onAddPassenger={noop}
        onRemoveLastPassenger={noop}
        onBack={noop}
        onReview={noop}
      />,
    );

    expect(markup).toContain("بعدی: مرور و تأیید");
    expect(markup).not.toContain("بعدی: راننده و خودرو");
  });
});
