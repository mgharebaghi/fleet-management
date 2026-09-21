import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { projectTripListItem } from "../workspace/trip-workspace-view";
import {
  TripRequestCard,
  TripRequestCards,
  TripRequestListRow,
} from "./trip-request-list-row";
import { tripRequestStatusTone } from "../trip-list-status-tone";

describe("TripRequestListRow", () => {
  it("renders compact row fields from the list read model projection as table row", () => {
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
      <table>
        <tbody>
          <TripRequestListRow request={request} status="New" />
        </tbody>
      </table>,
    );

    expect(markup).toContain("<tr");
    expect(markup).toContain("<td");
    expect(markup).toContain("TR-1405-0012");
    expect(markup).toContain("تهران");
    expect(markup).toContain("قم");
    expect(markup).toContain("ماموریت اداری");
    expect(markup).toContain("مسافر");
    expect(markup).toContain("جدید");
    expect(markup).toContain('href="/trips/12"');
    expect(markup).toContain("رسیدگی");
    expect(markup).not.toContain("رسیدگی به درخواست");
    expect(markup.indexOf("TR-1405-0012")).toBeLessThan(markup.indexOf("تهران"));
    expect(markup).not.toContain("اقدام بعدی");
    expect(markup).not.toContain("مرحله");
  });

  it("renders standard status label and مشاهده for non-New requests", () => {
    const request = projectTripListItem({
      tripRequestId: 14,
      requestNo: "TR-1405-0014",
      requestTypeName: "مبدأ و مقصد مشترک",
      requestDateTime: new Date("2026-05-17T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-05-18T04:30:00Z"),
      purpose: "ماموریت",
      status: "Assigned",
      passengerCount: 1,
      origins: ["تهران"],
      destinations: ["کرج"],
    });

    const markup = renderToStaticMarkup(
      <table>
        <tbody>
          <TripRequestListRow request={request} status="Assigned" />
        </tbody>
      </table>,
    );

    expect(markup).toContain("تخصیص‌یافته");
    expect(markup).toContain("مشاهده");
    expect(markup).not.toContain("رسیدگی");
  });

  it("renders pure tr element without outer table wrapper", () => {
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

    expect(markup.startsWith("<tr")).toBe(true);
    expect(markup).not.toContain("<table");
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

describe("TripRequestCard and TripRequestCards", () => {
  it("renders a single mobile record card directly", () => {
    const request = projectTripListItem({
      tripRequestId: 15,
      requestNo: "TR-1405-0015",
      requestTypeName: "مبدأ مشترک",
      requestDateTime: new Date("2026-05-17T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-05-18T04:30:00Z"),
      purpose: "بازدید پروژه",
      status: "Assigned",
      passengerCount: 3,
      origins: ["مشهد"],
      destinations: ["نیشابور"],
    });

    const markup = renderToStaticMarkup(
      <TripRequestCard request={request} status="Assigned" />,
    );

    expect(markup).toContain("TR-1405-0015");
    expect(markup).toContain("تخصیص‌یافته");
    expect(markup).toContain("مشهد");
  });

  it("renders mobile record card with جدید and رسیدگی for New requests", () => {
    const request = projectTripListItem({
      tripRequestId: 16,
      requestNo: "TR-1405-0016",
      requestTypeName: "مبدأ مشترک",
      requestDateTime: new Date("2026-05-17T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-05-18T04:30:00Z"),
      purpose: "بازدید",
      status: "New",
      passengerCount: 1,
      origins: ["شیراز"],
      destinations: ["مرودشت"],
    });

    const markup = renderToStaticMarkup(
      <TripRequestCard request={request} status="New" />,
    );

    expect(markup).toContain("TR-1405-0016");
    expect(markup).toContain("جدید");
    expect(markup).toContain("رسیدگی");
    expect(markup).not.toContain("رسیدگی به درخواست");
  });

  it("renders mobile record cards with details and link", () => {
    const request = projectTripListItem({
      tripRequestId: 15,
      requestNo: "TR-1405-0015",
      requestTypeName: "مبدأ مشترک",
      requestDateTime: new Date("2026-05-17T04:30:00Z"),
      requestedTravelDateTime: new Date("2026-05-18T04:30:00Z"),
      purpose: "بازدید پروژه",
      status: "Assigned",
      passengerCount: 3,
      origins: ["مشهد"],
      destinations: ["نیشابور"],
    });

    const markup = renderToStaticMarkup(
      <TripRequestCards rows={[{ view: request, status: "Assigned" }]} />,
    );

    expect(markup).toContain("TR-1405-0015");
    expect(markup).toContain("تخصیص‌یافته");
    expect(markup).toContain("مشهد");
    expect(markup).toContain("نیشابور");
    expect(markup).toContain("زمان سفر");
    expect(markup).toContain("نوع درخواست");
    expect(markup).toContain("بازدید پروژه");
    expect(markup).toContain("تعداد مسافر");
    expect(markup).toContain('href="/trips/15"');
    expect(markup).toContain("مشاهده");
  });
});

describe("Trip request status colors", () => {
  it.each([
    ["New", "purple"],
    ["Assigned", "warning"],
    ["InProgress", "info"],
    ["Completed", "positive"],
    ["Cancelled", "negative"],
  ])("presents %s with the %s tone", (status, tone) => {
    expect(tripRequestStatusTone(status)).toBe(tone);
  });
});
