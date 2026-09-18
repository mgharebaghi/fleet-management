import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { projectTripListItem } from "./workspace/trip-workspace-view";
import { TripRequestListRow } from "./trip-request-list-row";

describe("TripRequestListRow", () => {
  it("renders compact row fields from the list read model projection", () => {
    const request = projectTripListItem({
      tripRequestId: 12,
      requestNo: "TR-1405-0012",
      requestTypeName: "مبدأ و مقصد مشترک",
      requestDateTime: new Date("2026-05-17T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-05-18T04:30:00Z"),
      purpose: "ماموریت اداری",
      status: "New",
      passengerCount: 2,
      origins: ["تهران"],
      destinations: ["قم"],
    });

    const markup = renderToStaticMarkup(
      <TripRequestListRow request={request} status="New" />,
    );

    expect(markup).toContain("TR-1405-0012");
    expect(markup).toContain("تهران");
    expect(markup).toContain("قم");
    expect(markup).toContain("ماموریت اداری");
    expect(markup).toContain("مسافر");
    expect(markup).toContain("جدید");
    expect(markup).toContain('href="/trips/12"');
    expect(markup).toContain("مشاهده جزئیات");
    expect(markup).not.toContain("اقدام بعدی");
    expect(markup).not.toContain("مرحله");
  });

  it("falls back to request type when purpose is empty", () => {
    const request = projectTripListItem({
      tripRequestId: 8,
      requestNo: "TR-1405-0008",
      requestTypeName: "مقصد مشترک",
      requestDateTime: new Date("2026-05-16T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-05-17T04:30:00Z"),
      purpose: null,
      status: "InProgress",
      passengerCount: 1,
      origins: ["تهران"],
      destinations: ["اصفهان"],
    });

    const markup = renderToStaticMarkup(
      <TripRequestListRow request={request} status="InProgress" />,
    );

    expect(markup).toContain("مقصد مشترک");
    expect(markup).toContain("در حال اجرا");
  });
});
