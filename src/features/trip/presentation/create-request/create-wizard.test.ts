import { describe, expect, it } from "vitest";

import {
  createRequestReview,
  gapNotice,
  mergePreservedLocationValues,
  passengerStepGaps,
  preservedLocationValue,
  requestStepGaps,
  reviewContainsRawId,
  shouldSubmitCreateForm,
  typeExplanation,
  wizardErrorNavigation,
  wizardFieldForLocationFailure,
  wizardLocationErrorFocus,
  wizardStepForField,
} from "./create-wizard";

const requestTypes = [
  {
    tripRequestTypeId: 3,
    typeCode: "COMMON_ORIGIN_DESTINATION",
    typeName: "مبدأ و مقصد مشترک",
    description: null,
  },
  {
    tripRequestTypeId: 1,
    typeCode: "COMMON_ORIGIN",
    typeName: "مبدأ مشترک - مقاصد مختلف",
    description: null,
  },
  {
    tripRequestTypeId: 2,
    typeCode: "COMMON_DESTINATION",
    typeName: "مقصد مشترک - مبدأهای مختلف",
    description: null,
  },
];

const people = [
  {
    personId: 44,
    firstName: "علی",
    lastName: "رضایی",
    personnelNo: "P-1",
    mobile: null,
    isActive: true,
  },
];

const locations = [
  {
    locationId: 80,
    locationName: "تهران",
    locationCode: "TEH",
    locationType: null,
    address: null,
    isActive: true,
  },
  {
    locationId: 81,
    locationName: "قم",
    locationCode: "QOM",
    locationType: null,
    address: null,
    isActive: true,
  },
];

describe("Trip create wizard presentation", () => {
  it("keeps request-type explanations local to the known type codes", () => {
    expect(typeExplanation("COMMON_ORIGIN")).toContain("مبدأ مشترک");
    expect(typeExplanation("COMMON_DESTINATION")).toContain("مقصد مشترک");
    expect(typeExplanation("COMMON_ORIGIN_DESTINATION")).toContain(
      "یکسان است",
    );
  });

  it("returns request-level errors to step 1 and passenger errors to step 2", () => {
    expect(wizardStepForField("purpose", "PURPOSE_TOO_LONG")).toBe(1);
    expect(wizardStepForField("commonOriginLocationId")).toBe(1);
    expect(wizardStepForField("passenger.0.personId", "PERSON_NOT_FOUND")).toBe(
      2,
    );
    expect(wizardStepForField(undefined, "PASSENGER_REQUIRED")).toBe(2);
  });

  it("does not submit until the review dialog is open", () => {
    expect(shouldSubmitCreateForm(false)).toBe(false);
    expect(shouldSubmitCreateForm(true)).toBe(true);
  });

  it("requires request-level fields before leaving step 1", () => {
    expect(
      requestStepGaps(
        {
          tripRequestTypeId: "3",
          requestDay: "2025-03-21",
          requestTime: "08:00",
        },
        "COMMON_ORIGIN_DESTINATION",
      ),
    ).toEqual([
      "requestedTravelDay",
      "requestedTravelTime",
      "commonOriginLocationId",
      "commonDestinationLocationId",
    ]);
    expect(
      requestStepGaps(
        {
          tripRequestTypeId: "3",
          requestDay: "2025-03-21",
          requestTime: "08:00",
          requestedTravelDay: "2025-03-22",
          requestedTravelTime: "08:00",
          commonOriginLocationId: "80",
          commonDestinationLocationId: "81",
        },
        "COMMON_ORIGIN_DESTINATION",
      ),
    ).toEqual([]);
  });

  it("requires a selected passenger and unshared origin or destination", () => {
    expect(
      passengerStepGaps(
        { "passenger.0.personId": "" },
        "COMMON_ORIGIN_DESTINATION",
      ),
    ).toEqual(["passenger.0.personId"]);
    expect(
      passengerStepGaps(
        { "passenger.0.personId": "44" },
        "COMMON_ORIGIN",
      ),
    ).toEqual(["passenger.0.destinationLocationId"]);
    expect(
      passengerStepGaps(
        {
          "passenger.0.personId": "44",
          "passenger.0.destinationLocationId": "81",
        },
        "COMMON_ORIGIN",
      ),
    ).toEqual([]);
  });

  it("builds a human-readable review without raw identifiers", () => {
    const review = createRequestReview(
      {
        tripRequestTypeId: "3",
        purpose: "جلسه",
        requestDay: "2025-03-21",
        requestTime: "08:00",
        requestedTravelDay: "2025-03-22",
        requestedTravelTime: "09:00",
        commonOriginLocationId: "80",
        commonDestinationLocationId: "81",
        "passenger.0.personId": "44",
      },
      { requestTypes, people, locations },
    );

    expect(review.requestTypeName).toBe("مبدأ و مقصد مشترک");
    expect(review.purpose).toBe("جلسه");
    expect(review.commonOriginName).toBe("تهران");
    expect(review.commonDestinationName).toBe("قم");
    expect(review.passengers[0]).toMatchObject({
      personName: "علی رضایی",
      originName: "تهران",
      destinationName: "قم",
    });
    expect(review.requestAt).toContain("۱۴۰۴");
    expect(reviewContainsRawId(review, [3, 44, 80, 81])).toBe(false);
    expect(gapNotice(["tripRequestTypeId", "requestDay"])).toContain(
      "نوع درخواست",
    );
  });

  it("preserves common and passenger Location values when switching types away and back", () => {
    const afterCommonOrigin = mergePreservedLocationValues(
      {},
      {
        commonOriginLocationId: "80",
        "passenger.0.destinationLocationId": "81",
      },
    );
    const afterSharedBoth = mergePreservedLocationValues(afterCommonOrigin, {
      commonOriginLocationId: "80",
      commonDestinationLocationId: "82",
    });
    expect(afterSharedBoth).toMatchObject({
      commonOriginLocationId: "80",
      commonDestinationLocationId: "82",
      "passenger.0.destinationLocationId": "81",
    });

    const afterCommonDestination = mergePreservedLocationValues(
      afterSharedBoth,
      {
        commonDestinationLocationId: "82",
        "passenger.0.originLocationId": "80",
      },
    );
    expect(
      preservedLocationValue(
        afterCommonDestination,
        undefined,
        "commonOriginLocationId",
      ),
    ).toBe("80");
    expect(
      preservedLocationValue(
        afterCommonDestination,
        undefined,
        "passenger.0.destinationLocationId",
      ),
    ).toBe("81");
    expect(
      preservedLocationValue(
        afterCommonDestination,
        undefined,
        "passenger.0.originLocationId",
      ),
    ).toBe("80");

    const backToCommonOrigin = mergePreservedLocationValues(
      afterCommonDestination,
      {
        commonOriginLocationId: "80",
        "passenger.0.destinationLocationId": "",
      },
    );
    expect(
      preservedLocationValue(
        backToCommonOrigin,
        undefined,
        "commonDestinationLocationId",
      ),
    ).toBe("82");
    expect(
      preservedLocationValue(
        backToCommonOrigin,
        undefined,
        "passenger.0.originLocationId",
      ),
    ).toBe("80");
    expect(
      preservedLocationValue(
        backToCommonOrigin,
        undefined,
        "passenger.0.destinationLocationId",
      ),
    ).toBe("");
  });

  it("maps Application Location failure context to the visible wizard field", () => {
    expect(
      wizardFieldForLocationFailure("COMMON_ORIGIN", {
        passengerIndex: 0,
        locationRole: "origin",
      }),
    ).toBe("commonOriginLocationId");
    expect(
      wizardFieldForLocationFailure("COMMON_ORIGIN", {
        passengerIndex: 0,
        locationRole: "destination",
      }),
    ).toBe("passenger.0.destinationLocationId");
    expect(
      wizardFieldForLocationFailure("COMMON_DESTINATION", {
        passengerIndex: 1,
        locationRole: "destination",
      }),
    ).toBe("commonDestinationLocationId");
    expect(
      wizardFieldForLocationFailure("COMMON_DESTINATION", {
        passengerIndex: 1,
        locationRole: "origin",
      }),
    ).toBe("passenger.1.originLocationId");
    expect(
      wizardFieldForLocationFailure("COMMON_ORIGIN_DESTINATION", {
        passengerIndex: 0,
        locationRole: "origin",
      }),
    ).toBe("commonOriginLocationId");
    expect(
      wizardFieldForLocationFailure("COMMON_ORIGIN_DESTINATION", {
        passengerIndex: 0,
        locationRole: "destination",
      }),
    ).toBe("commonDestinationLocationId");
    expect(
      wizardFieldForLocationFailure("PER_PASSENGER", {
        passengerIndex: 2,
        locationRole: "origin",
      }),
    ).toBe("passenger.2.originLocationId");
    expect(
      wizardFieldForLocationFailure("PER_PASSENGER", {
        passengerIndex: 2,
        locationRole: "destination",
      }),
    ).toBe("passenger.2.destinationLocationId");

    expect(
      wizardLocationErrorFocus("LOCATION_NOT_FOUND", "COMMON_ORIGIN", {
        passengerIndex: 0,
        locationRole: "origin",
      }),
    ).toEqual({ step: 1, fields: ["commonOriginLocationId"] });
    expect(
      wizardLocationErrorFocus("LOCATION_INACTIVE", "COMMON_ORIGIN", {
        passengerIndex: 0,
        locationRole: "destination",
      }),
    ).toEqual({
      step: 2,
      fields: ["passenger.0.destinationLocationId"],
    });
    expect(
      wizardErrorNavigation(
        "LOCATION_NOT_FOUND",
        "passenger.0.originLocationId",
        "COMMON_ORIGIN_DESTINATION",
        { passengerIndex: 0, locationRole: "destination" },
      ).fields,
    ).toEqual(["commonDestinationLocationId"]);
    expect(
      wizardErrorNavigation(
        "PURPOSE_TOO_LONG",
        "purpose",
        "COMMON_ORIGIN_DESTINATION",
        undefined,
      ),
    ).toEqual({ step: 1, fields: ["purpose"] });
  });

  it("does not let a stale active catalog choose the failed Location field", () => {
    const staleActiveCatalog = [
      { locationId: 80, isActive: true },
      { locationId: 81, isActive: true },
    ];
    expect(staleActiveCatalog.every((item) => item.isActive)).toBe(true);
    expect(
      wizardErrorNavigation(
        "LOCATION_INACTIVE",
        "passenger.0.originLocationId",
        "COMMON_ORIGIN",
        { passengerIndex: 0, locationRole: "destination" },
      ),
    ).toEqual({
      step: 2,
      fields: ["passenger.0.destinationLocationId"],
    });
  });
});
