import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pagination } from "./pagination";

function renderPagination(currentPage: number, totalPages: number) {
  return renderToStaticMarkup(
    <Pagination
      label="صفحه‌بندی"
      currentPage={currentPage}
      totalPages={totalPages}
      buildHref={(pageNumber) => `/items?page=${pageNumber}`}
    />,
  );
}

describe("Pagination", () => {
  it("renders nothing while a single page holds every result", () => {
    expect(renderPagination(1, 1)).toBe("");
    expect(renderPagination(1, 0)).toBe("");
  });

  it("links to the neighbouring pages of the current one", () => {
    const markup = renderPagination(2, 3);

    expect(markup).toContain('href="/items?page=1"');
    expect(markup).toContain('href="/items?page=3"');
    expect(markup).toContain("صفحه ۲ از ۳");
  });

  it("keeps the boundary directions inert instead of linking out of range", () => {
    expect(renderPagination(1, 3)).not.toContain('href="/items?page=0"');
    expect(renderPagination(3, 3)).not.toContain('href="/items?page=4"');
  });
});
