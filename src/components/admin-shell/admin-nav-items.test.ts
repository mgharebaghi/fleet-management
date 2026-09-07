import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_SECTIONS,
  isAdminNavPathActive,
  isAdminNavSectionActive,
} from "./admin-nav-items";

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
});
