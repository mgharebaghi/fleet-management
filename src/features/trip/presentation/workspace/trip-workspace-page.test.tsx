import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TripExecutionRecord,
  TripPassengerRecord,
  TripRequestDetails,
} from "../../application/trip-records";
import { TripWorkspacePage } from "./trip-workspace-page";

// Resolve the app alias to real shared components without changing test configuration.
vi.mock("@/components/ui/back-link/back-link", () =>
  import("../../../../components/ui/back-link/back-link"),
);
vi.mock("@/components/ui/data-table/data-table", () =>
  import("../../../../components/ui/data-table/data-table"),
);
vi.mock("@/components/ui/page-shell/page-shell", () =>
  import("../../../../components/ui/page-shell/page-shell"),
);
vi.mock("@/components/ui/record-cards/record-cards", () =>
  import("../../../../components/ui/record-cards/record-cards"),
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
vi.mock("@/components/ui/action-link/action-link", () =>
  import("../../../../components/ui/action-link/action-link"),
);
vi.mock("@/components/ui/form-field/form-field", () =>
  import("../../../../components/ui/form-field/form-field"),
);
vi.mock("@/components/ui/icon/icons", () =>
  import("../../../../components/ui/icon/icons"),
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
vi.mock("@/components/ui/dialog/dialog", () =>
  import("../../../../components/ui/dialog/dialog"),
);
vi.mock("@/components/ui/icon-action-button/icon-action-button", () =>
  import("../../../../components/ui/icon-action-button/icon-action-button"),
);

const reader = vi.hoisted(() => ({
  details: vi.fn(),
  assignmentsActiveAt: vi.fn(),
  availableLocations: vi.fn(),
  availablePeople: vi.fn(),
}));

vi.mock("../../composition/trip.factory", () => ({
  makeReadTrips: () => reader,
}));
vi.mock("../trip.actions", () => ({
  saveTripExecutionAction: vi.fn(),
  changeTripRequestStatusAction: vi.fn(),
  cancelTripRequestAction: vi.fn(),
  addTripRouteAction: vi.fn(),
  savePassengerSurveyAction: vi.fn(),
  addTripPassengerAction: vi.fn(),
  updateTripPassengerAction: vi.fn(),
  deleteTripPassengerAction: vi.fn(),
  deleteTripRouteAction: vi.fn(),
}));
vi.mock("../location/location.actions", () => ({
  createLocationAction: vi.fn(),
}));


const person = {
  personId: 1,
  firstName: "علی",
  lastName: "رضایی",
  personnelNo: "P-1",  nationalCode: null,  mobile: "09120000000",
  isActive: true,
};

const location = {
  locationId: 1,
  locationCode: null,
  locationName: "تهران",
  locationType: null,
  address: null,
  isActive: true,
};

const assignment = {
  assignmentId: 9,
  fromDateTime: new Date("2026-01-01T00:00:00Z"),
  toDateTime: null,
  driverId: 1,
  driverFirstName: "رضا",
  driverLastName: "راننده",
  driverPersonnelNo: "D-1",
  driverIsActive: true,
  hasEligibleLicense: true,
  vehicle: {
    vehicleId: 1,
    vehicleCode: "V-1",
    plateNoLeftSide: "12",
    plateNoCenterChar: "ب",
    plateNoRightSide: "345",
    plateNoIranNo: "67",
    brandName: "Brand",
    modelName: "Model",
    vehicleTypeName: null,
    vehicleStatusName: "Operational",
    isActive: true,
  },
};

function execution(
  overrides: Partial<TripExecutionRecord> = {},
): TripExecutionRecord {
  return {
    tripExecutionId: 20,
    tripId: 11,
    assignment,
    actualPickupDateTime: null,
    actualDropoffDateTime: null,
    startOdometer: null,
    endOdometer: null,
    status: "Planned",
    passengerRating: null,
    passengerComment: null,
    surveyDateTime: null,
    description: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    routes: [],
    ...overrides,
  };
}

function passenger(
  overrides: Partial<TripPassengerRecord> = {},
): TripPassengerRecord {
  return {
    tripId: 11,
    passengerPersonId: 1,
    originLocationId: 1,
    destinationLocationId: 2,
    requestedPickupDateTime: null,
    pickupOrder: 1,
    dropoffOrder: 2,
    status: null,
    description: "صبح زود",
    passenger: person,
    origin: location,
    destination: { ...location, locationId: 2, locationName: "قم" },
    routes: [],
    executions: [],
    ...overrides,
  };
}

function details(
  overrides: Partial<TripRequestDetails> = {},
): TripRequestDetails {
  return {
    tripRequestId: 44,
    requestNo: "TR-1404-0001",
    requestType: {
      tripRequestTypeId: 1,
      typeCode: "COMMON_ORIGIN_DESTINATION",
      typeName: "مبدأ و مقصد مشترک",
      description: null,
    },
    requestDateTime: new Date("2026-03-21T04:30:00Z"),
    requestedTravelDateTime: new Date("2026-03-22T04:30:00Z"),
    purpose: "جلسه",
    status: "New",
    description: "توضیح پرونده",
    createdAt: new Date("2026-03-21T04:30:00Z"),
    passengers: [passenger()],
    ...overrides,
  };
}


beforeEach(() => {
  reader.details.mockResolvedValue(details());
  reader.assignmentsActiveAt.mockResolvedValue([assignment]);
  reader.availableLocations.mockResolvedValue([location]);
  reader.availablePeople.mockResolvedValue([person]);
});

async function renderWorkspace(requestedTab: string) {
  return renderToStaticMarkup(await TripWorkspacePage({
    tripRequestId: 44,
    requestedTab,
  }));
}

describe("Trip workspace presentation", () => {
  it.each([
    "details",
    "passengers",
    "assignment",
    "route",
    "completion",
  ])(
    "renders only the active %s body and keeps all five navigation tabs",
    async (tab) => {
      const markup = await renderWorkspace(tab);
      expect(markup.match(/id="workspace-tab-/g)).toHaveLength(1);
      expect(markup).toContain(`id="workspace-tab-${tab}"`);
      for (const label of [
        "جزئیات سفر",
        "مسافران",
        "راننده و خودرو",
        "مسیر",
        "جدید",
      ]) {
        expect(markup).toContain(label);
      }
      expect(markup.match(/data-active="true"/g)).toHaveLength(1);
    },
  );

  it.each([
    ["Completed", "تکمیل‌شده", "positive"],
    ["Cancelled", "لغوشده", "negative"],
    ["InProgress", "در حال اجرا", "info"],
    ["Assigned", "تخصیص‌یافته", "warning"],
    ["New", "جدید", "info"],
  ])(
    "dynamically presents 5th tab for %s status with label %s and tone %s",
    async (status, expectedLabel, expectedTone) => {
      reader.details.mockResolvedValue(
        details({
          status,
        }),
      );
      const markup = await renderWorkspace("completion");
      expect(markup).toContain(`<span>${expectedLabel}</span>`);
      expect(markup).toContain(`data-tone="${expectedTone}"`);
    },
  );

  it("renders a compact passenger table with responsive cards and separate statuses", async () => {
    reader.details.mockResolvedValue(details({
      passengers: [passenger({ status: "وضعیت ثبت‌شده", executions: [execution()] })],
    }));
    const markup = await renderWorkspace("passengers");
    for (const value of [
      "P-1", "09120000000", "تهران", "قم", "صبح زود",
      "مسافر", "مسیر", "زمان درخواست سوارشدن", "وضعیت ثبت‌شده",
      "وضعیت مسافر", "برنامه‌ریزی / اجرا", "ترتیب (سوار / پیاده)",
    ]) {
      expect(markup).toContain(value);
    }
    expect(markup).toContain("<table");
    expect(markup).toContain("فهرست مسافران سفر");
    expect(markup.match(/<th scope="col">/g)).toHaveLength(7);
    expect(markup).toMatch(/<span[^>]*dir="ltr"[^>]*>P-1<\/span>/);
    expect(markup).toMatch(
      /<span[^>]*dir="ltr"[^>]*>09120000000<\/span>/,
    );
    expect(markup).not.toContain("وضعیت برنامه‌ریزی / اجرا");
  });

  it("shows clean empty states for assignment and optional route", async () => {
    const assignmentMarkup = await renderWorkspace("assignment");
    expect(assignmentMarkup).toContain("هنوز تخصیص ثبت نشده است");

    const routeMarkup = await renderWorkspace("route");
    expect(routeMarkup).toContain(
      "هنوز مسیر اختیاری برای این سفر ثبت نشده است",
    );
    expect(routeMarkup).toContain("ثبت مسیر برنامه‌ریزی‌شده");
  });

  it("keeps Assignment operational with assignment details and voucher output", async () => {
    reader.details.mockResolvedValue(details({
      passengers: [passenger({ executions: [execution()] })],
    }));
    const markup = await renderWorkspace("assignment");
    expect(markup).not.toContain("تخصیص ثبت‌شده");
    expect(markup).toContain("برنامه‌ریزی‌شده");
    expect(markup).toContain('href="/trips/44/voucher/11"');
    expect(markup).toContain("صدور برگه مأموریت");
    expect(markup).not.toContain("مشخصات راننده");
    expect(markup).not.toContain("مشخصات خودرو");
    expect(markup).not.toContain("زمان تخصیص");
    expect(markup).toContain("شماره پرسنلی");
    expect(markup).toContain("بازه زمانی");
    expect(markup).not.toContain("نقطه‌ای برای این مسیر");
  });

  it.each([
    ["Completed"],
    ["Cancelled"],
  ])(
    "makes assignment read-only without repetitive notices for a %s request",
    async (status) => {
      reader.details.mockResolvedValue(
        details({
          status,
          passengers: [
            passenger({ executions: [execution({ status: status === "Cancelled" ? "Cancelled" : "Completed" })] }),
          ],
        }),
      );
      const markup = await renderWorkspace("assignment");
      expect(markup).not.toContain("این درخواست تکمیل شده است");
      expect(markup).not.toContain("این درخواست لغو شده است");
      expect(markup).not.toContain("تغییر تخصیص");
      if (status === "Cancelled") {
        expect(markup).not.toContain("/voucher/");
      }
    },
  );

  it("moves persisted passenger, assignment, and route history into dedicated tabs", async () => {
    reader.details.mockResolvedValue(
      details({
        status: "Completed",
        passengers: [
          passenger({
            routes: [
              {
                routeId: 31,
                tripId: 11,
                tripExecutionId: null,
                routeName: "مسیر اصلی",
                alternativeNo: null,
                distanceKm: "12.5",
                estimatedDurationMinute: 45,
                isSelected: true,
                description: "مسیر برنامه",
                createdAt: new Date("2026-03-21T04:30:00Z"),
                points: [
                  {
                    routePointId: 41,
                    location: {
                      ...location,
                      locationId: 3,
                      locationName: "ایستگاه میانی",
                    },
                    trafficZone: "زوج و فرد",
                    sequenceNo: 3,
                    distanceFromStartKm: "6.5",
                    description: "توقف کوتاه",
                  },
                ],
              },
            ],
            executions: [
              execution({
                status: "Completed",
                actualPickupDateTime: new Date("2026-03-22T04:30:00Z"),
                actualDropoffDateTime: new Date("2026-03-22T08:30:00Z"),
                startOdometer: "100",
                endOdometer: "140",
                description: "اجرای ثبت‌شده",
                passengerRating: 5,
                passengerComment: "خوب بود",
                surveyDateTime: new Date("2026-03-22T09:00:00Z"),
              }),
            ],
          }),
        ],
      }),
    );
    const detailsMarkup = await renderWorkspace("details");
    expect(detailsMarkup).toContain("اطلاعات درخواست");
    expect(detailsMarkup).toContain("زمان‌بندی");
    expect(detailsMarkup).not.toContain("P-1");
    expect(detailsMarkup).not.toContain("مسیر اصلی");
    expect(detailsMarkup).not.toContain("Brand");

    const passengersMarkup = await renderWorkspace("passengers");
    expect(passengersMarkup).toContain("P-1");
    expect(passengersMarkup).toContain("09120000000");
    expect(passengersMarkup).not.toContain("Brand");

    const assignmentMarkup = await renderWorkspace("assignment");
    for (const value of ["رضا", "راننده", "D-1", "Brand", "Model", "V-1"]) {
      expect(assignmentMarkup).toContain(value);
    }
    expect(assignmentMarkup).toContain("گواهینامه واجد شرایط");

    const routeMarkup = await renderWorkspace("route");
    for (const value of [
      "مسیر اصلی",
      "12.5",
      "45",
      "نقاط مسیر",
      "1 نقطه",
      "نمایش نقاط",
    ]) {
      expect(routeMarkup).toContain(value);
    }
    // Points are collapsed by default, so point details are hidden until expanded
    expect(routeMarkup).not.toContain("ایستگاه میانی");
    expect(routeMarkup).not.toContain("ثبت مسیر برنامه‌ریزی‌شده");
  });

  it("shows operational execution form and retains description for InProgress requests", async () => {
    reader.details.mockResolvedValue(details({
      status: "InProgress",
      passengers: [
        passenger({ executions: [execution({ status: "InProgress", description: "توضیح اجرای اول" })] }),
        passenger({
          tripId: 12,
          passenger: { ...person, personId: 2, firstName: "مسافر دوم" },
          executions: [execution({ tripId: 12, tripExecutionId: 21, status: "InProgress", description: "توضیح اجرای دوم" })],
        }),
      ],
    }));
    const markup = await renderWorkspace("completion");
    expect(markup).toContain("توضیح اجرای اول");
    expect(markup).not.toContain("Brand");
    expect(markup).not.toContain("Model");
    expect(markup).toContain("توضیح اجرای دوم");
    expect(markup).toContain("تکمیل اجرا");
    expect(markup).not.toContain("(اختیاری)");
  });

  it.each([
    ["Completed"],
    ["Cancelled"],
  ])(
    "makes execution history read-only for a %s request",
    async (status) => {
      reader.details.mockResolvedValue(
        details({
          status,
          passengers: [
            passenger({
              executions: [
                execution({
                  status: "Completed",
                  description: "سابقهٔ اجرا",
                }),
              ],
            }),
          ],
        }),
      );
      const markup = await renderWorkspace("completion");
      expect(markup).toContain("سابقه اجرای سفر");
      expect(markup).not.toContain("این سفر به پایان رسیده");
      expect(markup).toContain("سابقهٔ اجرا");
      expect(markup).not.toContain("تکمیل اجرا");
      expect(markup).not.toContain("لغو برنامه");
      expect(markup).not.toContain("اقدام درخواست");
    },
  );

  it("presents survey as optional, not a completion prerequisite", async () => {
    const markup = await renderWorkspace("completion");
    expect(markup).toContain("نظرسنجی اختیاری است و برای تکمیل درخواست الزامی نیست");
    expect(markup).not.toContain('<progress');
  });

  it("shows recorded survey with modal action button on completed execution", async () => {
    reader.details.mockResolvedValue(details({
      status: "Completed",
      passengers: [passenger({
        executions: [execution({
          status: "Completed",
          passengerRating: 5,
          passengerComment: "سفر آرام و منظم",
        })],
      })],
    }));
    const markup = await renderWorkspace("completion");
    expect(markup).toContain("سفر آرام و منظم");
    expect(markup).toContain("امتیاز: 5 از ۵");
    expect(markup).toContain("مشاهده / ویرایش نظرسنجی");
    expect(markup).not.toContain('<details');
  });

  it("places request number before back link in header for natural RTL balance", async () => {
    const markup = await renderWorkspace("details");
    const h1Index = markup.indexOf("<h1");
    const backLinkIndex = markup.indexOf('href="/trips/requests"');
    expect(h1Index).toBeGreaterThan(-1);
    expect(backLinkIndex).toBeGreaterThan(-1);
    expect(h1Index).toBeLessThan(backLinkIndex);
  });

  it("renders 'ثبت درخواست' as primary action for New request with plan", async () => {
    reader.details.mockResolvedValue(details({
      status: "New",
      passengers: [passenger({ executions: [execution()] })],
    }));
    const markup = await renderWorkspace("completion");
    expect(markup).toContain("ثبت درخواست");
    expect(markup).not.toContain("ثبت تخصیص‌یافته");
    expect(markup).toContain("اقدام درخواست");
    expect(markup).not.toContain("اقدامات سفر");
  });

  it("removes internal section headings and redundant 'تخصیص ثبت‌شده' in assignment tab", async () => {
    reader.details.mockResolvedValue(details({
      passengers: [passenger({ executions: [execution()] })],
    }));
    const markup = await renderWorkspace("assignment");
    expect(markup).not.toContain("زمان تخصیص");
    expect(markup).not.toContain("زمان‌بندی تخصیص");
    expect(markup).not.toContain("مشخصات راننده");
    expect(markup).not.toContain("مشخصات خودرو");
    expect(markup).not.toContain("بازه اعتبار تخصیص");
    expect(markup).not.toContain("تخصیص ثبت‌شده");
    expect(markup).toContain("شماره پرسنلی");
    expect(markup).toContain("بازه زمانی");
  });

  it("renders passenger management actions on non-terminal requests and omits them on terminal requests", async () => {
    // Non-terminal request (e.g. Assigned)
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [passenger()],
    }));
    const nonTerminalMarkup = await renderWorkspace("passengers");
    expect(nonTerminalMarkup).toContain("افزودن مسافر");
    expect(nonTerminalMarkup).toContain("ویرایش");
    expect(nonTerminalMarkup).toContain("حذف");

    // Terminal request (e.g. Completed)
    reader.details.mockResolvedValue(details({
      status: "Completed",
      passengers: [passenger()],
    }));
    const terminalMarkup = await renderWorkspace("passengers");
    expect(terminalMarkup).not.toContain("افزودن مسافر");
    expect(terminalMarkup).not.toContain("ویرایش");
    expect(terminalMarkup).not.toContain("حذف");
  });

  it("renders TripAssignmentPlanner for unassigned passengers in assignment tab when non-terminal", async () => {
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({ tripId: 10, executions: [execution()] }),
        passenger({ tripId: 11, executions: [] }), // newly added unassigned passenger
      ],
    }));
    const markup = await renderWorkspace("assignment");
    expect(markup).toContain("تخصیص خودرو و راننده");
  });

  it("renders TripCompletionButton in InProgress request completion tab without stacked form", async () => {
    reader.details.mockResolvedValue(details({
      status: "InProgress",
      passengers: [passenger({ executions: [execution({ status: "InProgress" })] })],
    }));
    const markup = await renderWorkspace("completion");
    expect(markup).toContain("ثبت / ویرایش اطلاعات اجرای مسافران");
    expect(markup).toContain("اطلاعات اجرای مسافران");
    expect(markup).toContain("حرکت واقعی");
    expect(markup).toContain("بازگشت واقعی");
  });

  it("offers request cancellation in the lifecycle action area only while eligible", async () => {
    const detailsTab = await renderWorkspace("details");
    expect(detailsTab).not.toContain(">لغو درخواست<");
    const cancellable = await renderWorkspace("completion");
    const cancelAt = cancellable.indexOf(">لغو درخواست<");
    const lifecycleAt = cancellable.indexOf("اقدام درخواست");
    expect(cancelAt).toBeGreaterThan(lifecycleAt);
    expect(cancellable).not.toContain("requestCancelRow");
    expect(cancellable).not.toContain("اگر این سفر انجام نمی‌شود");
    expect(cancellable).toContain("ادامه درخواست");
    expect(cancellable).toContain("در سوابق می‌ماند");
    expect(cancellable).not.toContain("تأیید لغو");

    reader.details.mockResolvedValue(details({
      status: "InProgress",
      passengers: [passenger({ executions: [execution({ status: "InProgress", actualPickupDateTime: new Date("2026-03-22T04:30:00Z") })] })],
    }));
    const running = await renderWorkspace("completion");
    expect(running).not.toContain(">لغو درخواست<");
    expect(running).not.toContain("ادامه درخواست");
    expect(running).toContain("در حال اجرا");
  });

  it("renders Assigned request with operational summary and start trip action", async () => {
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [passenger({ executions: [execution()] })],
    }));
    const markup = await renderWorkspace("completion");
    expect(markup).toContain("شروع سفر");
    expect(markup.indexOf(">لغو درخواست<")).toBeGreaterThan(markup.indexOf(">شروع سفر<"));
    expect(markup).toContain("خلاصهٔ عملیاتی سفر آمادهٔ شروع");
    expect(markup).toContain("آمادهٔ شروع");
    expect(markup).toContain("رضا راننده");
  });

  it("renders Completed and Cancelled requests strictly read-only", async () => {
    reader.details.mockResolvedValue(details({
      status: "Completed",
      passengers: [passenger({ executions: [execution({ status: "Completed", actualPickupDateTime: new Date("2026-03-22T04:30:00Z"), actualDropoffDateTime: new Date("2026-03-22T08:30:00Z") })] })],
    }));
    const completedMarkup = await renderWorkspace("completion");
    expect(completedMarkup).toContain("پروندهٔ این سفر با موفقیت تکمیل شده است");
    expect(completedMarkup).toContain("مشخصات راننده و خودرو");
    expect(completedMarkup).toContain("رضا راننده");
    expect(completedMarkup).toContain("Brand");
    expect(completedMarkup).toContain("Model");
    expect(completedMarkup).toContain("V-1");
    expect(completedMarkup).toContain("تکمیل‌شده");
    expect(completedMarkup).not.toContain("شروع سفر");
    expect(completedMarkup).not.toContain("ثبت / ویرایش اطلاعات اجرای مسافران");

    reader.details.mockResolvedValue(details({
      status: "Cancelled",
      passengers: [passenger({ executions: [execution({ status: "Cancelled" })] })],
    }));
    const cancelledMarkup = await renderWorkspace("completion");
    expect(cancelledMarkup).toContain("این درخواست سفر لغو شده است");
    expect(cancelledMarkup).toContain("فقط برای مشاهدهٔ سوابق");
    expect(cancelledMarkup).not.toContain("شروع سفر");
    expect(cancelledMarkup).not.toContain(">لغو درخواست<");
    expect(cancelledMarkup).not.toContain("ادامه درخواست");
  });

  it("separates operational summary into passenger and driver/vehicle sections", async () => {
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({
          tripId: 1,
          executions: [execution()],
        }),
        passenger({
          tripId: 2,
          passenger: { ...person, personId: 2, firstName: "مریم", lastName: "احمدی" },
          executions: [execution({ tripExecutionId: 2, tripId: 2 })],
        }),
      ],
    }));
    const markup = await renderWorkspace("completion");
    // Section 1: مسافران (since > 1)
    expect(markup).toContain("مسافران");
    expect(markup).toContain("علی رضایی");
    expect(markup).toContain("مریم احمدی");
    expect(markup).toContain("زمان حرکت درخواستی");
    expect(markup).toContain("آمادهٔ شروع");

    // Section 2: راننده و خودرو
    expect(markup).toContain("راننده و خودرو");
    expect(markup).toContain("رضا راننده");
    expect(markup).toContain("تخصیص ثبت‌شده");
    expect(markup).toContain("گواهینامه واجد شرایط");
    expect(markup).toContain("Brand");
    expect(markup).toContain("Model");
  });

  it("freezes planning data during InProgress (omits add/edit/delete across tabs)", async () => {
    reader.details.mockResolvedValue(details({
      status: "InProgress",
      passengers: [
        passenger({
          tripId: 1,
          routes: [{
            routeId: 10,
            tripId: 1,
            tripExecutionId: null,
            routeName: "مسیر اصلی",
            alternativeNo: null,
            distanceKm: "15",
            estimatedDurationMinute: 30,
            isSelected: true,
            description: null,
            createdAt: new Date(),
            points: [],
          }],
          executions: [execution({ status: "InProgress" })],
        }),
      ],
    }));

    // Passengers tab: no add, edit, or delete
    const passengersMarkup = await renderWorkspace("passengers");
    expect(passengersMarkup).not.toContain("افزودن مسافر");
    expect(passengersMarkup).not.toContain("ویرایش");
    expect(passengersMarkup).not.toContain("حذف");

    // Route tab: no add or delete route buttons
    const routeMarkup = await renderWorkspace("route");
    expect(routeMarkup).not.toContain("ثبت مسیر برنامه‌ریزی‌شده");
    expect(routeMarkup).not.toContain("حذف مسیر");

    // Assignment tab: no planner
    expect(await renderWorkspace("assignment")).not.toContain("تخصیص خودرو و راننده");
  });

  it("deduplicates driver/vehicle assignment cards when multiple passengers share the same assignment", async () => {
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({
          tripId: 1,
          executions: [execution({ tripExecutionId: 10, assignment })],
        }),
        passenger({
          tripId: 2,
          passenger: { ...person, personId: 2, firstName: "مریم", lastName: "احمدی" },
          executions: [execution({ tripExecutionId: 20, assignment })],
        }),
      ],
    }));

    const markup = await renderWorkspace("assignment");
    const matches = markup.match(/رضا راننده/g);
    expect(matches).toHaveLength(1);
    expect(markup).toContain("گواهینامه واجد شرایط");
    expect(markup).toContain("Brand");
  });

  it("renders distinct driver/vehicle assignment cards when passengers have different assignments", async () => {
    const secondAssignment = {
      ...assignment,
      assignmentId: 10,
      driverFirstName: "حسن",
      driverLastName: "کرمی",
      driverPersonnelNo: "D-2",
    };

    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({
          tripId: 1,
          executions: [execution({ tripExecutionId: 10, assignment })],
        }),
        passenger({
          tripId: 2,
          passenger: { ...person, personId: 2, firstName: "مریم", lastName: "احمدی" },
          executions: [execution({ tripExecutionId: 20, assignment: secondAssignment })],
        }),
      ],
    }));

    const markup = await renderWorkspace("assignment");
    expect(markup).toContain("رضا راننده");
    expect(markup).toContain("حسن کرمی");
  });

  it("deduplicates route cards when multiple passengers have equivalent routes and omits owner label", async () => {
    const sharedRoute = {
      routeId: 101,
      tripId: 1,
      tripExecutionId: null,
      routeName: "مسیر اصلی مشترک",
      alternativeNo: null,
      distanceKm: "25",
      estimatedDurationMinute: 45,
      isSelected: true,
      description: null,
      createdAt: new Date(),
      points: [],
    };

    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({
          tripId: 1,
          routes: [sharedRoute],
          executions: [execution()],
        }),
        passenger({
          tripId: 2,
          passenger: { ...person, personId: 2, firstName: "مریم", lastName: "احمدی" },
          routes: [{ ...sharedRoute, tripId: 2, routeId: 102 }],
          executions: [execution()],
        }),
      ],
    }));

    const markup = await renderWorkspace("route");
    const routeTitleMatches = markup.match(/<h3[^>]*>مسیر اصلی مشترک<\/h3>/g);
    expect(routeTitleMatches).toHaveLength(1);
    expect(markup).not.toContain("مسافر:");
    expect(markup).not.toContain("مسافران:");
  });

  it("renders separate route cards with passenger labels when routes differ", async () => {
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({
          tripId: 1,
          routes: [{
            routeId: 201,
            tripId: 1,
            tripExecutionId: null,
            routeName: "مسیر شمال",
            alternativeNo: null,
            distanceKm: "10",
            estimatedDurationMinute: 20,
            isSelected: true,
            description: null,
            createdAt: new Date(),
            points: [],
          }],
          executions: [execution()],
        }),
        passenger({
          tripId: 2,
          passenger: { ...person, personId: 2, firstName: "مریم", lastName: "احمدی" },
          routes: [{
            routeId: 202,
            tripId: 2,
            tripExecutionId: null,
            routeName: "مسیر جنوب",
            alternativeNo: null,
            distanceKm: "30",
            estimatedDurationMinute: 50,
            isSelected: true,
            description: null,
            createdAt: new Date(),
            points: [],
          }],
          executions: [execution()],
        }),
      ],
    }));

    const markup = await renderWorkspace("route");
    expect(markup).toContain("مسیر شمال");
    expect(markup).toContain("مسافر: علی رضایی");
    expect(markup).toContain("مسیر جنوب");
    expect(markup).toContain("مسافر: مریم احمدی");
  });

  it("changes top route action to 'افزودن مسیر جایگزین' when at least one route exists", async () => {
    reader.details.mockResolvedValue(details({
      status: "Assigned",
      passengers: [
        passenger({
          tripId: 1,
          routes: [{
            routeId: 10,
            tripId: 1,
            tripExecutionId: null,
            routeName: "مسیر اول",
            alternativeNo: null,
            distanceKm: "15",
            estimatedDurationMinute: 30,
            isSelected: true,
            description: null,
            createdAt: new Date(),
            points: [],
          }],
          executions: [execution()],
        }),
      ],
    }));

    const markup = await renderWorkspace("route");
    expect(markup).toContain("افزودن مسیر جایگزین");
    expect(markup).not.toContain("ثبت مسیر برنامه‌ریزی‌شده");
  });

  it("renders read-only lifecycle progress indicator for New request with first stage current", async () => {
    reader.details.mockResolvedValue(details({ status: "New" }));
    const markup = await renderWorkspace("details");

    expect(markup).toContain("وضعیت پیشرفت سفر");
    expect(markup).toContain('data-stage="request" data-state="current"');
    expect(markup).toContain('data-stage="assignment" data-state="upcoming"');
    expect(markup).toContain('data-stage="execution" data-state="upcoming"');
    expect(markup).toContain('data-stage="completion" data-state="upcoming"');
    expect(markup).toContain("مرحله فعلی");

    // Read-only: no buttons or navigation links inside the timeline
    const timelineSnippet = markup.match(/<ol[^>]*class="[^"]*lifecycleTimeline[^"]*"[^>]*>[\s\S]*?<\/ol>/)?.[0] ?? "";
    expect(timelineSnippet).not.toContain("<button");
    expect(timelineSnippet).not.toContain("<a");
  });

  it("renders lifecycle progress indicator for Assigned request with request complete and assignment current", async () => {
    reader.details.mockResolvedValue(details({ status: "Assigned" }));
    const markup = await renderWorkspace("details");

    expect(markup).toContain('data-stage="request" data-state="complete"');
    expect(markup).toContain('data-stage="assignment" data-state="current"');
    expect(markup).toContain('data-stage="execution" data-state="upcoming"');
    expect(markup).toContain("مرحله فعلی");
  });

  it("renders lifecycle progress indicator for InProgress request with execution current", async () => {
    reader.details.mockResolvedValue(details({ status: "InProgress" }));
    const markup = await renderWorkspace("details");

    expect(markup).toContain('data-stage="request" data-state="complete"');
    expect(markup).toContain('data-stage="assignment" data-state="complete"');
    expect(markup).toContain('data-stage="execution" data-state="current"');
    expect(markup).toContain('data-stage="completion" data-state="upcoming"');
    expect(markup).toContain("مرحله فعلی");
  });

  it("renders lifecycle progress indicator for Completed request with all stages complete and terminal treatment", async () => {
    reader.details.mockResolvedValue(details({ status: "Completed" }));
    const markup = await renderWorkspace("details");

    expect(markup).toContain('data-stage="request" data-state="complete"');
    expect(markup).toContain('data-stage="assignment" data-state="complete"');
    expect(markup).toContain('data-stage="execution" data-state="complete"');
    expect(markup).toContain('data-stage="completion" data-state="current" data-terminal="true"');
    expect(markup).toContain("تکمیل‌شده");
  });

  it("renders terminal Cancelled presentation in progress section without fabricated history", async () => {
    reader.details.mockResolvedValue(details({ status: "Cancelled" }));
    const markup = await renderWorkspace("details");

    expect(markup).toContain("وضعیت پیشرفت سفر");
    expect(markup).toContain("لغوشده");
    expect(markup).not.toContain('data-stage="execution"');
    expect(markup).not.toContain('data-stage="completion"');
  });

  it("renders purpose in details section and does not duplicate it in header summary", async () => {
    reader.details.mockResolvedValue(details({ purpose: "مأموریت اداری ویژه" }));
    const markup = await renderWorkspace("details");

    expect(markup).toContain("<dt>هدف سفر</dt>");
    expect(markup).toContain("<dd>مأموریت اداری ویژه</dd>");
    expect(markup).not.toContain("purposeLine");
  });
});
