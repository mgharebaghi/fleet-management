import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the Persian label text rather than relying on color alone", () => {
    const markup = renderToStaticMarkup(
      <StatusBadge label="فعال" tone="positive" />,
    );

    expect(markup).toContain("فعال");
  });

  it("applies a distinct visual tone for the negative case", () => {
    const positiveMarkup = renderToStaticMarkup(
      <StatusBadge label="فعال" tone="positive" />,
    );
    const negativeMarkup = renderToStaticMarkup(
      <StatusBadge label="غیرفعال" tone="negative" />,
    );

    expect(positiveMarkup).not.toBe(negativeMarkup);
    expect(negativeMarkup).toContain("غیرفعال");
  });
});
