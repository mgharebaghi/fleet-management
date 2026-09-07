import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminLoading from "./loading";

describe("admin route loading boundary", () => {
  it("renders shared page loading feedback inside the persistent admin layout", () => {
    const markup = renderToStaticMarkup(<AdminLoading />);
    expect(markup).toContain("در حال بارگذاری");
    expect(markup).toContain('role="status"');
  });
});
