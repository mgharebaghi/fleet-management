import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListFilterBar, ListSearchField } from "./list-filter-bar";
const noCriteria = { visible: false, href: "/people", onNavigate: () => {} };

describe("ListFilterBar", () => {
  it("owns the common clear action and renders it only for applied criteria", () => {
    const clear = { visible: false, href: "/people", onNavigate: () => {} };
    expect(renderToStaticMarkup(<ListFilterBar clear={clear}>Fields</ListFilterBar>)).not.toContain("پاک کردن فیلترها");
    const html = renderToStaticMarkup(<ListFilterBar clear={{ ...clear, visible: true }}>Fields</ListFilterBar>);
    expect(html).toContain("پاک کردن فیلترها");
    expect(html).toContain('href="/people"');
  });
  it("renders no pending indicator by default", () => {
    const markup = renderToStaticMarkup(
      <ListFilterBar clear={noCriteria}>
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
      <ListFilterBar pending clear={noCriteria}>
        <ListSearchField
          label="جستجو"
          name="search"
          value=""
          onChange={() => {}}
        />
      </ListFilterBar>,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("در حال بارگذاری");
  });

  it("uses the same loading text for every listing", () => {
    const markup = renderToStaticMarkup(
      <ListFilterBar pending clear={noCriteria}>
        <ListSearchField
          label="جستجو"
          name="search"
          value=""
          onChange={() => {}}
        />
      </ListFilterBar>,
    );

    expect(markup).toContain("در حال بارگذاری");
  });
});
