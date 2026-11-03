import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingIndicator } from "./loading-indicator";

describe("LoadingIndicator", () => {
  it("renders an accessible inline loading status", () => {
    const markup = renderToStaticMarkup(
      <LoadingIndicator />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("در حال بارگذاری");
  });

  it("renders the same fixed loading text for pages", () => {
    const markup = renderToStaticMarkup(
      <LoadingIndicator
        variant="page"
      />,
    );

    expect(markup).toContain("در حال بارگذاری");
    expect(markup).not.toContain("لطفاً چند لحظه منتظر بمانید.");
  });
});
