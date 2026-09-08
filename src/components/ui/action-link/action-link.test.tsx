import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActionLink } from "./action-link";

describe("ActionLink", () => {
  it("renders a decorative pending hint alongside the link content", () => {
    const markup = renderToStaticMarkup(
      <ActionLink href="/people">پاک کردن</ActionLink>,
    );

    expect(markup).toContain('href="/people"');
    expect(markup).toContain("پاک کردن");
    expect(markup).toContain('aria-hidden="true"');
  });
});
