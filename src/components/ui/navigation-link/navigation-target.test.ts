import { describe, expect, it } from "vitest";
import { isPageNavigation } from "./navigation-target";

describe("page navigation targets", () => {
  const current = "http://localhost:3000/drivers?search=test";
  it("recognizes page changes from text, icon, submenu and relative links", () => {
    for (const href of ["/drivers/12", "/inventory/parts", "drivers/12", { pathname: "/people", query: { page: 2 } }]) expect(isPageNavigation(href, current)).toBe(true);
  });
  it("keeps pagination, filters, tabs and anchors local", () => {
    for (const href of ["/drivers?page=2", "?search=next", "#details", { query: { page: 2 } }]) expect(isPageNavigation(href, current)).toBe(false);
  });
  it("does not take over external, email or download navigation", () => {
    for (const href of ["https://example.org/people", "mailto:team@example.org", "javascript:void(0)"]) expect(isPageNavigation(href, current)).toBe(false);
  });
});
