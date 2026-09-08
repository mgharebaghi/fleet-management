import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListFilterBar, ListSearchField } from "./list-filter-bar";

describe("ListFilterBar", () => {
  it("renders no pending indicator by default", () => {
    const markup = renderToStaticMarkup(
      <ListFilterBar>
        <ListSearchField
          label="جستجو"
          name="search"
          value=""
          onChange={() => {}}
        />
      </ListFilterBar>,
    );

    expect(markup).not.toContain('role="status"');
  });

  it("shows the shared loading indicator while a filter navigation is pending", () => {
    const markup = renderToStaticMarkup(
      <ListFilterBar pending>
        <ListSearchField
          label="جستجو"
          name="search"
          value=""
          onChange={() => {}}
        />
      </ListFilterBar>,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("در حال به‌روزرسانی نتایج…");
  });

  it("accepts a feature-specific pending label", () => {
    const markup = renderToStaticMarkup(
      <ListFilterBar pending pendingLabel="در حال جستجوی رانندگان…">
        <ListSearchField
          label="جستجو"
          name="search"
          value=""
          onChange={() => {}}
        />
      </ListFilterBar>,
    );

    expect(markup).toContain("در حال جستجوی رانندگان…");
  });
});
