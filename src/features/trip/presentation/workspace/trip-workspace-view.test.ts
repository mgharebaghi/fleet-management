import { describe, expect, it } from "vitest";

import type {
  TripExecutionRecord,
  TripPassengerRecord,
  TripRequestDetails,
  TripRoute,
  TripRoutePoint,
} from "../../application/trip-records";
import {
  areRoutesEquivalent,
  buildTripLifecycleVisualModel,
  defaultPassengerTabIndex,
  distinctAssignmentExecutions,
  groupRoutesForDisplay,
  projectTripListItem,
  projectTripWorkspace,
  workspaceFinalTabMeta,
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

function routePoint(overrides: Partial<TripRoutePoint> = {}): TripRoutePoint {
  return {
    routePointId: 101,
    location,
    trafficZone: null,
    sequenceNo: 1,
    distanceFromStartKm: "5",
    description: null,
    ...overrides,
  };
}

function route(overrides: Partial<TripRoute> = {}): TripRoute {
  return {
    routeId: 1,
    tripId: 11,
    tripExecutionId: null,
    routeName: "مسیر اصلی",
    alternativeNo: null,
    distanceKm: "12.5",
    estimatedDurationMinute: 45,
    isSelected: true,
    description: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    points: [],
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

  it("maps Assigned without actual start to start trip", () => {
    const view = projectTripWorkspace(
      details({
        status: "Assigned",
        passengers: [passenger({ executions: [execution()] })],
      }),
    );
    expect(view.currentStageId).toBe("ready");
    expect(view.nextAction.id).toBe("mark-in-progress");
    expect(view.nextAction.label).toBe("شروع سفر");
    expect(view.canCancel).toBe(true);
  });

  it("maps Assigned after actual start to mark in progress without cancellation", () => {
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

  it("maps InProgress mixed passengers to complete request disabled until all complete", () => {
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
    expect(view.nextAction.id).toBe("complete-request");
    expect(view.nextAction.label).toBe("تکمیل سفر");
    expect(view.nextAction.enabled).toBe(false);
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
    expect(workspaceSectionForTab("passengers")).toBe("passengers");
    expect(workspaceSectionForTab("assignment")).toBe("assignment");
    expect(workspaceSectionForTab("driver")).toBe("assignment");
    expect(workspaceSectionForTab("vehicle")).toBe("assignment");
    expect(workspaceSectionForTab("route")).toBe("route");
    expect(workspaceSectionForTab("execution")).toBe("completion");
    expect(workspaceSectionForTab("survey")).toBe("completion");
    expect(workspaceSectionForTab("return")).toBe("completion");
    expect(workspaceSectionForTab("completion")).toBe("completion");
    expect(workspaceSectionForTab("status")).toBe("completion");
    expect(workspaceSectionForTab("planning")).toBe("assignment");
    expect(workspaceSectionForTab(undefined)).toBe("details");
  });

  it("provides dynamic label, tone, and icon for the 5th final status tab", () => {
    expect(workspaceFinalTabMeta("Completed")).toEqual({
      label: "تکمیل‌شده",
      tone: "positive",
      iconName: "check",
    });
    expect(workspaceFinalTabMeta("Cancelled")).toEqual({
      label: "لغوشده",
      tone: "negative",
      iconName: "warning",
    });
    expect(workspaceFinalTabMeta("InProgress")).toEqual({
      label: "در حال اجرا",
      tone: "info",
      iconName: "trips",
    });
    expect(workspaceFinalTabMeta("Assigned")).toEqual({
      label: "تخصیص‌یافته",
      tone: "warning",
      iconName: "trips",
    });
    expect(workspaceFinalTabMeta("New")).toEqual({
      label: "جدید",
      tone: "info",
      iconName: "trips",
    });
  });

  it("builds tab hrefs without query for the default details tab", () => {
    expect(workspaceTabHref(44, "details")).toBe("/trips/44");
    expect(workspaceTabHref(44, "passengers")).toBe(
      "/trips/44?tab=passengers",
    );
    expect(workspaceTabHref(44, "assignment")).toBe(
      "/trips/44?tab=assignment",
    );
    expect(workspaceTabHref(44, "route")).toBe("/trips/44?tab=route");
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
    ).toBe("شروع سفر");
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
    ).toBe("تکمیل اجرای مسافران");
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

describe("Multi-passenger Assignment Deduplication", () => {
  it("groups two passengers with same VehicleDriverAssignmentId into one card", () => {
    const p1 = passenger({
      tripId: 10,
      passenger: { ...person, firstName: "علی" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 12 } })],
    });
    const p2 = passenger({
      tripId: 11,
      passenger: { ...person, firstName: "حامد" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 12 } })],
    });

    const distinct = distinctAssignmentExecutions([p1, p2]);
    expect(distinct).toHaveLength(1);
    expect(distinct[0].assignmentId).toBe(12);
    expect(distinct[0].passengerNames).toEqual(["علی رضایی", "حامد رضایی"]);
  });

  it("renders two separate cards for two passengers with different assignment IDs", () => {
    const p1 = passenger({
      tripId: 10,
      passenger: { ...person, firstName: "علی" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 12 } })],
    });
    const p2 = passenger({
      tripId: 11,
      passenger: { ...person, firstName: "حامد" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 19 } })],
    });

    const distinct = distinctAssignmentExecutions([p1, p2]);
    expect(distinct).toHaveLength(2);
    expect(distinct.map((d) => d.assignmentId)).toEqual([12, 19]);
  });

  it("groups three passengers sharing one assignment into one card", () => {
    const p1 = passenger({
      tripId: 10,
      passenger: { ...person, firstName: "علی" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 12 } })],
    });
    const p2 = passenger({
      tripId: 11,
      passenger: { ...person, firstName: "حامد" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 12 } })],
    });
    const p3 = passenger({
      tripId: 12,
      passenger: { ...person, firstName: "رضا" },
      executions: [execution({ assignment: { ...assignment, assignmentId: 12 } })],
    });

    const distinct = distinctAssignmentExecutions([p1, p2, p3]);
    expect(distinct).toHaveLength(1);
    expect(distinct[0].assignmentId).toBe(12);
    expect(distinct[0].passengerNames).toHaveLength(3);
  });
});

describe("Multi-passenger Route Equivalence and Grouping", () => {
  it("treats routes with same RouteId as equivalent", () => {
    const r1 = route({ routeId: 100 });
    const r2 = route({ routeId: 100 });
    expect(areRoutesEquivalent(r1, r2)).toBe(true);

    const p1 = passenger({ tripId: 10, routes: [r1] });
    const p2 = passenger({ tripId: 11, routes: [r2] });
    const groups = groupRoutesForDisplay([p1, p2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBeUndefined();
  });

  it("treats routes with different RouteIds but identical route + ordered points as one shared route card", () => {
    const r1 = route({
      routeId: 101,
      routeName: "مسیر اصلی",
      isSelected: true,
      distanceKm: "25.0",
      estimatedDurationMinute: 40,
      points: [
        routePoint({ sequenceNo: 1, location: { ...location, locationId: 1 } }),
        routePoint({ sequenceNo: 2, location: { ...location, locationId: 2 } }),
      ],
    });
    const r2 = route({
      routeId: 102,
      routeName: " مسیر اصلی ",
      isSelected: true,
      distanceKm: "25",
      estimatedDurationMinute: 40,
      points: [
        routePoint({ sequenceNo: 1, location: { ...location, locationId: 1 } }),
        routePoint({ sequenceNo: 2, location: { ...location, locationId: 2 } }),
      ],
    });

    expect(areRoutesEquivalent(r1, r2)).toBe(true);

    const p1 = passenger({ tripId: 10, routes: [r1] });
    const p2 = passenger({ tripId: 11, routes: [r2] });
    const groups = groupRoutesForDisplay([p1, p2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBeUndefined();
  });

  it("treats routes with different route fields as separate cards", () => {
    const r1 = route({ routeId: 101, routeName: "مسیر اتوبان", isSelected: true });
    const r2 = route({ routeId: 102, routeName: "مسیر جاده قدیم", isSelected: false });

    expect(areRoutesEquivalent(r1, r2)).toBe(false);

    const p1 = passenger({ tripId: 10, routes: [r1] });
    const p2 = passenger({ tripId: 11, routes: [r2] });
    const groups = groupRoutesForDisplay([p1, p2]);
    expect(groups).toHaveLength(2);
  });

  it("treats same route fields but different RoutePoint data/order as separate cards", () => {
    // Different locations
    const r1 = route({
      routeId: 101,
      points: [routePoint({ sequenceNo: 1, location: { ...location, locationId: 1 } })],
    });
    const r2 = route({
      routeId: 102,
      points: [routePoint({ sequenceNo: 1, location: { ...location, locationId: 99 } })],
    });
    expect(areRoutesEquivalent(r1, r2)).toBe(false);

    // Different sequence/order
    const r3 = route({
      routeId: 103,
      points: [
        routePoint({ sequenceNo: 1, location: { ...location, locationId: 1 } }),
        routePoint({ sequenceNo: 2, location: { ...location, locationId: 2 } }),
      ],
    });
    const r4 = route({
      routeId: 104,
      points: [
        routePoint({ sequenceNo: 2, location: { ...location, locationId: 1 } }),
        routePoint({ sequenceNo: 1, location: { ...location, locationId: 2 } }),
      ],
    });
    expect(areRoutesEquivalent(r3, r4)).toBe(false);

    const p1 = passenger({ tripId: 10, routes: [r3] });
    const p2 = passenger({ tripId: 11, routes: [r4] });
    const groups = groupRoutesForDisplay([p1, p2]);
    expect(groups).toHaveLength(2);
  });

  it("shows correct passenger association on distinct route cards", () => {
    const rA = route({ routeId: 201, routeName: "مسیر شمال" });
    const rB = route({ routeId: 202, routeName: "مسیر جنوب" });

    const p1 = passenger({
      tripId: 10,
      passenger: { ...person, firstName: "علی", lastName: "" },
      routes: [rA],
    });
    const p2 = passenger({
      tripId: 11,
      passenger: { ...person, firstName: "حامد", lastName: "" },
      routes: [rA],
    });
    const p3 = passenger({
      tripId: 12,
      passenger: { ...person, firstName: "رضا", lastName: "" },
      routes: [rB],
    });

    const groups = groupRoutesForDisplay([p1, p2, p3]);
    expect(groups).toHaveLength(2);

    const groupA = groups.find((g) => g.route.routeId === 201);
    const groupB = groups.find((g) => g.route.routeId === 202);

    expect(groupA?.label).toBe("مسافران: علی، حامد");
    expect(groupB?.label).toBe("مسافر: رضا");
  });
});

describe("Trip lifecycle progress visual model", () => {
  it("maps 'New' status to first stage current and remainder upcoming", () => {
    const model = buildTripLifecycleVisualModel("New");
    expect(model.isCancelled).toBe(false);
    if (!model.isCancelled) {
      expect(model.stages).toHaveLength(4);
      expect(model.stages[0]).toEqual({
        id: "request",
        label: "ثبت درخواست",
        isComplete: false,
        isCurrent: true,
      });
      expect(model.stages[1]).toEqual({
        id: "assignment",
        label: "تخصیص‌یافته",
        isComplete: false,
        isCurrent: false,
      });
      expect(model.stages[2]).toEqual({
        id: "execution",
        label: "در حال اجرا",
        isComplete: false,
        isCurrent: false,
      });
      expect(model.stages[3]).toEqual({
        id: "completion",
        label: "تکمیل‌شده",
        isComplete: false,
        isCurrent: false,
      });
    }
  });

  it("maps 'Assigned' status to request complete and Assigned current", () => {
    const model = buildTripLifecycleVisualModel("Assigned");
    expect(model.isCancelled).toBe(false);
    if (!model.isCancelled) {
      expect(model.stages[0]).toEqual({
        id: "request",
        label: "ثبت درخواست",
        isComplete: true,
        isCurrent: false,
      });
      expect(model.stages[1]).toEqual({
        id: "assignment",
        label: "تخصیص‌یافته",
        isComplete: true,
        isCurrent: true,
      });
      expect(model.stages[2].isComplete).toBe(false);
      expect(model.stages[2].isCurrent).toBe(false);
      expect(model.stages[3].isComplete).toBe(false);
      expect(model.stages[3].isCurrent).toBe(false);
    }
  });

  it("maps 'InProgress' status to earlier stages complete and InProgress current", () => {
    const model = buildTripLifecycleVisualModel("InProgress");
    expect(model.isCancelled).toBe(false);
    if (!model.isCancelled) {
      expect(model.stages[0].isComplete).toBe(true);
      expect(model.stages[1].isComplete).toBe(true);
      expect(model.stages[2]).toEqual({
        id: "execution",
        label: "در حال اجرا",
        isComplete: false,
        isCurrent: true,
      });
      expect(model.stages[3]).toEqual({
        id: "completion",
        label: "تکمیل‌شده",
        isComplete: false,
        isCurrent: false,
      });
    }
  });

  it("maps 'Completed' status to all stages complete with terminal current emphasis", () => {
    const model = buildTripLifecycleVisualModel("Completed");
    expect(model.isCancelled).toBe(false);
    if (!model.isCancelled) {
      expect(model.stages.every((s) => s.isComplete)).toBe(true);
      expect(model.stages[3]).toEqual({
        id: "completion",
        label: "تکمیل‌شده",
        isComplete: true,
        isCurrent: true,
      });
    }
  });

  it("maps 'Cancelled' status to terminal cancelled state without fabricated stage history", () => {
    const model = buildTripLifecycleVisualModel("Cancelled");
    expect(model.isCancelled).toBe(true);
    if (model.isCancelled) {
      expect(model.statusLabel).toBe("لغوشده");
      expect(model.description).toContain("لغو شده");
    }
  });
});
