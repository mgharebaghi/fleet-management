import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TripPassengerSwitcher } from "../passenger/trip-passenger-switcher";

const noop = () => {};

describe("Trip create passenger switcher", () => {
  it("renders a tab for each passenger and marks the active tab", () => {
    const markup = renderToStaticMarkup(
      <TripPassengerSwitcher
        passengerCount={2}
        activeIndex={0}
        onSelect={noop}
        onAdd={noop}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain("مسافر 1");
    expect(markup).toContain("مسافر 2");
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain("افزودن مسافر");
  });
});
