import { describe, expect, it } from "vitest";

import type {
  TripExecutionRecord,
  TripPassengerRecord,
  TripRequestDetails,
} from "../../application/trip-records";
import {
  defaultPassengerTabIndex,
  projectTripListItem,
  projectTripWorkspace,
  workspaceSectionForTab,
  workspaceTabHref,
} from "./trip-workspace-view";

const person = {
  personId: 1,
  firstName: "علی",
  lastName: "رضایی",
  personnelNo: "P-1",
  mobile: "09120000000",
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

describe("Trip workspace view model", () => {
  it("maps New without a plan to planning and assignment next action", () => {
    const view = projectTripWorkspace(details());
    expect(view.currentStageId).toBe("planning");
    expect(view.nextAction.id).toBe("plan-assignment");
    expect(view.assignmentReadiness).toBe("needed");
    expect(view.routeReadiness).toBe("missing-optional");
    expect(view.voucherReadiness).toBe("after-assignment");
    expect(view.canCancel).toBe(true);
    expect(view.stages.find((stage) => stage.id === "planning")?.state).toBe(
      "current",
    );
  });

  it("maps New with a persisted plan to ready / mark assigned", () => {
    const view = projectTripWorkspace(
      details({
        passengers: [passenger({ executions: [execution()] })],
      }),
    );
    expect(view.currentStageId).toBe("ready");
    expect(view.nextAction.id).toBe("mark-assigned");
    expect(view.assignmentReadiness).toBe("recorded");
    expect(view.voucherReadiness).toBe("ready");
    expect(view.passengers[0]?.hasPlan).toBe(true);
  });

  it("maps Assigned without actual start to record departure", () => {
    const view = projectTripWorkspace(
      details({
        status: "Assigned",
        passengers: [passenger({ executions: [execution()] })],
      }),
    );
    expect(view.currentStageId).toBe("ready");
    expect(view.nextAction.id).toBe("record-departure");
    expect(view.canCancel).toBe(true);
  });

  it("maps Assigned after actual start to mark in progress", () => {
    const view = projectTripWorkspace(
      details({
        status: "Assigned",
        passengers: [
          passenger({
            executions: [
              execution({
                actualPickupDateTime: new Date("2026-03-22T04:30:00Z"),
              }),
            ],
          }),
        ],
      }),
    );
    expect(view.nextAction.id).toBe("mark-in-progress");
    expect(view.canCancel).toBe(false);
  });

  it("maps InProgress mixed passengers to record return", () => {
    const view = projectTripWorkspace(
      details({
        status: "InProgress",
        passengers: [
          passenger({
            executions: [
              execution({
                status: "Completed",
                actualPickupDateTime: new Date("2026-03-22T04:30:00Z"),
                actualDropoffDateTime: new Date("2026-03-22T08:30:00Z"),
              }),
            ],
          }),
          passenger({
            tripId: 12,
            passenger: { ...person, personId: 2, firstName: "مریم" },
            executions: [
              execution({
                tripExecutionId: 21,
                tripId: 12,
                status: "InProgress",
                actualPickupDateTime: new Date("2026-03-22T04:30:00Z"),
              }),
            ],
          }),
        ],
      }),
    );
    expect(view.passengerCount).toBe(2);
    expect(view.originSummary).toBe("تهران");
    expect(view.destinationSummary).toBe("قم");
    expect(view.nextAction.id).toBe("record-return");
    expect(view.passengers[0]?.canRecordIncident).toBe(true);
    expect(view.passengers[0]?.canSurvey).toBe(true);
    expect(view.passengers[1]?.canRecordIncident).toBe(false);
  });

  it("maps Completed and Cancelled without inventing transitions", () => {
    const completed = projectTripWorkspace(
      details({
        status: "Completed",
        passengers: [
          passenger({
            routes: [
              {
                routeId: 1,
                tripId: 11,
                tripExecutionId: null,
                routeName: "مسیر اصلی",
                alternativeNo: null,
                distanceKm: "12",
                estimatedDurationMinute: 40,
                isSelected: true,
                description: null,
                createdAt: new Date("2026-03-21T04:30:00Z"),
                points: [],
              },
            ],
            executions: [
              execution({
                status: "Completed",
                actualPickupDateTime: new Date("2026-03-22T04:30:00Z"),
                actualDropoffDateTime: new Date("2026-03-22T08:30:00Z"),
              }),
            ],
          }),
        ],
      }),
    );
    expect(completed.currentStageId).toBe("return");
    expect(completed.nextAction.id).toBe("view-details");
    expect(completed.canCancel).toBe(false);
    expect(completed.routeReadiness).toBe("recorded");
    expect(completed.stages.every((stage) => stage.state === "complete")).toBe(
      true,
    );

    const cancelled = projectTripWorkspace(details({ status: "Cancelled" }));
    expect(cancelled.canCancel).toBe(false);
    expect(cancelled.stages.every((stage) => stage.state === "cancelled")).toBe(
      true,
    );
    expect(cancelled.nextAction.id).toBe("view-details");
  });

  it("maps old tab query values onto workspace sections", () => {
    expect(workspaceSectionForTab("general")).toBe("details");
    expect(workspaceSectionForTab("passengers")).toBe("details");
    expect(workspaceSectionForTab("assignment")).toBe("planning");
    expect(workspaceSectionForTab("route")).toBe("planning");
    expect(workspaceSectionForTab("execution")).toBe("execution");
    expect(workspaceSectionForTab("survey")).toBe("completion");
    expect(workspaceSectionForTab("return")).toBe("completion");
    expect(workspaceSectionForTab("completion")).toBe("completion");
    expect(workspaceSectionForTab("planning")).toBe("planning");
    expect(workspaceSectionForTab(undefined)).toBe("details");
  });

  it("builds tab hrefs without query for the default details tab", () => {
    expect(workspaceTabHref(44, "details")).toBe("/trips/44");
    expect(workspaceTabHref(44, "planning")).toBe("/trips/44?tab=planning");
    expect(workspaceTabHref(44, "completion")).toBe(
      "/trips/44?tab=completion",
    );
  });

  it("defaults passenger switcher to first incomplete passenger", () => {
    const view = projectTripWorkspace(
      details({
        passengers: [
          passenger({ executions: [execution()] }),
          passenger({
            tripId: 12,
            passenger: { ...person, personId: 2, firstName: "مریم" },
          }),
        ],
      }),
    );
    expect(defaultPassengerTabIndex(view.passengers, "planning")).toBe(1);
    expect(
      defaultPassengerTabIndex(
        projectTripWorkspace(
          details({
            passengers: [
              passenger({
                executions: [
                  execution({ status: "Completed" }),
                ],
              }),
            ],
          }),
        ).passengers,
        "execution",
      ),
    ).toBe(0);
  });

  it("projects list rows from request summaries only", () => {
    const row = projectTripListItem({
      tripRequestId: 44,
      requestNo: "TR-1404-0001",
      requestTypeName: "مبدأ و مقصد مشترک",
      requestDateTime: new Date("2026-03-21T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-03-22T04:30:00Z"),
      purpose: "جلسه",
      status: "New",
      passengerCount: 2,
      origins: ["تهران"],
      destinations: ["قم", "کاشان"],
    });
    expect(row.currentStageLabel).toBe("برنامه‌ریزی");
    expect(row.nextActionHint).toBe("ثبت خودرو و راننده");
    expect(row.destinationSummary).toBe("چند مقصد");
    expect(
      projectTripListItem({
        tripRequestId: 45,
        requestNo: "TR-1404-0002",
        requestTypeName: "مبدأ و مقصد مشترک",
        requestDateTime: new Date("2026-03-21T04:30:00Z"),
        requestedTravelDateTime: new Date("2026-03-22T04:30:00Z"),
        purpose: null,
        status: "Assigned",
        passengerCount: 1,
        origins: ["تهران"],
        destinations: ["قم"],
      }).nextActionHint,
    ).toBe("ثبت زمان حرکت");
    expect(
      projectTripListItem({
        tripRequestId: 46,
        requestNo: "TR-1404-0003",
        requestTypeName: "مبدأ و مقصد مشترک",
        requestDateTime: new Date("2026-03-21T04:30:00Z"),
        requestedTravelDateTime: new Date("2026-03-22T04:30:00Z"),
        purpose: null,
        status: "InProgress",
        passengerCount: 1,
        origins: ["تهران"],
        destinations: ["قم"],
      }).nextActionHint,
    ).toBe("ثبت بازگشت");
    expect(
      projectTripListItem({
        tripRequestId: 47,
        requestNo: "TR-1404-0004",
        requestTypeName: "مبدأ و مقصد مشترک",
        requestDateTime: new Date("2026-03-21T04:30:00Z"),
        requestedTravelDateTime: new Date("2026-03-22T04:30:00Z"),
        purpose: null,
        status: "Completed",
        passengerCount: 1,
        origins: ["تهران"],
        destinations: ["قم"],
      }).currentStageLabel,
    ).toBe("تکمیل");
    expect(
      projectTripListItem({
        tripRequestId: 48,
        requestNo: "TR-1404-0005",
        requestTypeName: "مبدأ و مقصد مشترک",
        requestDateTime: new Date("2026-03-21T04:30:00Z"),
        requestedTravelDateTime: new Date("2026-03-22T04:30:00Z"),
        purpose: null,
        status: "Cancelled",
        passengerCount: 1,
        origins: ["تهران"],
        destinations: ["قم"],
      }).nextActionHint,
    ).toBe("مشاهده جزئیات سفر");
  });
});
