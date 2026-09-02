import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingIndicator } from "./loading-indicator";

describe("LoadingIndicator", () => {
  it("renders an accessible inline loading status", () => {
    const markup = renderToStaticMarkup(
      <LoadingIndicator label="در حال ثبت اطلاعات…" />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("در حال ثبت اطلاعات…");
  });

  it("renders the page loading description when provided", () => {
    const markup = renderToStaticMarkup(
      <LoadingIndicator
        variant="page"
        label="در حال آماده‌سازی صفحه…"
        description="لطفاً چند لحظه منتظر بمانید."
      />,
    );

    expect(markup).toContain("در حال آماده‌سازی صفحه…");
    expect(markup).toContain("لطفاً چند لحظه منتظر بمانید.");
  });
});
