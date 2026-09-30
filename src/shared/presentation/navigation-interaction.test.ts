import { describe, expect, it } from "vitest";
import { isPlainNavigationClick, rtlTabIndex } from "./navigation-interaction";

describe("navigation interaction", () => {
  const click = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  it("intercepts only unmodified primary clicks", () => {
    expect(isPlainNavigationClick(click)).toBe(true);
    for (const key of ["defaultPrevented", "metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(isPlainNavigationClick({ ...click, [key]: true })).toBe(false);
    }
    expect(isPlainNavigationClick({ ...click, button: 1 })).toBe(false);
  });
  it.each([["ArrowLeft", 2, 0], ["ArrowRight", 0, 2], ["Home", 2, 0], ["End", 0, 2]] as const)("handles RTL %s", (key, current, expected) => {
    expect(rtlTabIndex(key, current, 3)).toBe(expected);
  });
  it("leaves other keys alone and tolerates an empty list", () => {
    expect(rtlTabIndex("Tab", 0, 3)).toBeNull();
    expect(rtlTabIndex("Home", 0, 0)).toBeNull();
  });
});
