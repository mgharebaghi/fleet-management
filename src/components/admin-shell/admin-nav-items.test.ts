import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_SECTIONS,
  findActiveAdminNavChild,
  findAdminNavTrail,
  isAdminNavGroupPage,
  isAdminNavPathActive,
  isAdminNavSectionActive,
} from "./admin-nav-items";

describe("ADMIN_NAV_SECTIONS labels", () => {
  const fleetSection = ADMIN_NAV_SECTIONS.find(
    (section) => section.label === "ناوگان",
  )!;

  it("uses the updated fleet child navigation labels", () => {
    expect(
      fleetSection.children?.map((child) => child.label),
    ).toEqual(["خودروهای سازمان", "بیمه ها", "کاتالوگ خودروها"]);
    expect(findAdminNavTrail("/fleet/vehicles")).toEqual([
      "ناوگان",
      "خودروهای سازمان",
    ]);
    expect(findAdminNavTrail("/fleet/catalogs")).toEqual([
      "ناوگان",
      "کاتالوگ خودروها",
    ]);
  });
});

describe("isAdminNavPathActive", () => {
  it("matches the href exactly", () => {
    expect(isAdminNavPathActive("/people", "/people")).toBe(true);
  });

  it("matches a nested route under the href", () => {
    expect(isAdminNavPathActive("/people/create", "/people")).toBe(true);
  });

  it("does not match a sibling route that merely shares a prefix", () => {
    expect(isAdminNavPathActive("/peopleX", "/people")).toBe(false);
  });

  it("does not match an unrelated route", () => {
    expect(isAdminNavPathActive("/drivers", "/people")).toBe(false);
  });
});

describe("isAdminNavSectionActive", () => {
  const fleetSection = ADMIN_NAV_SECTIONS.find(
    (section) => section.label === "ناوگان",
  )!;

  it("is active when the current path matches a child route", () => {
    expect(
      isAdminNavSectionActive("/fleet/vehicle-insurances", fleetSection),
    ).toBe(true);
  });

  it("is active for a nested route under a child", () => {
    expect(
      isAdminNavSectionActive("/fleet/vehicles/create", fleetSection),
    ).toBe(true);
  });

  it("is inactive for an unrelated section", () => {
    const peopleSection = ADMIN_NAV_SECTIONS.find(
      (section) => section.label === "افراد",
    )!;

    expect(isAdminNavSectionActive("/fleet/vehicles", peopleSection)).toBe(
      false,
    );
  });

  it("keeps Trip landing and nested request routes in one section", () => {
    const tripSection = ADMIN_NAV_SECTIONS.find(
      (section) => section.label === "سفرها",
    )!;

    expect(isAdminNavSectionActive("/trips", tripSection)).toBe(true);
    expect(isAdminNavSectionActive("/trips/123", tripSection)).toBe(true);
  });
});

describe("active navigation trail", () => {
  const tripSection = ADMIN_NAV_SECTIONS.find(
    (section) => section.label === "سفرها",
  )!;

  it("marks only the related child on detail and edit routes", () => {
    expect(findAdminNavTrail("/people/4/edit")).toEqual(["افراد"]);
    expect(findAdminNavTrail("/drivers/4")).toEqual(["رانندگان"]);
    expect(findAdminNavTrail("/fleet/vehicles/8/edit")).toEqual([
      "ناوگان",
      "خودروهای سازمان",
    ]);
    expect(findAdminNavTrail("/fleet/vehicle-insurances/3/edit")).toEqual([
      "ناوگان",
      "بیمه ها",
    ]);
    expect(findAdminNavTrail("/trips/create")).toEqual([
      "سفرها",
      "ثبت درخواست سفر",
    ]);
    expect(findAdminNavTrail("/trips/15")).toEqual([
      "سفرها",
      "فهرست درخواست‌ها",
    ]);
    expect(findAdminNavTrail("/trips/15/voucher/2")).toEqual([
      "سفرها",
      "فهرست درخواست‌ها",
    ]);
    expect(findActiveAdminNavChild("/trips", tripSection)).toBeUndefined();
    expect(isAdminNavGroupPage("/trips", tripSection)).toBe(true);
    expect(isAdminNavGroupPage("/trips/requests", tripSection)).toBe(false);
  });
});
