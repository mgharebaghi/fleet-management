import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Dialog } from "./dialog";

const noop = () => {};

describe("Dialog", () => {
  it("renders a closed native dialog labelled by the given title, with a close action and the content", () => {
    const markup = renderToStaticMarkup(
      <Dialog open={false} onClose={noop} titleId="sample-title" title="نمونه">
        <p>محتوا</p>
      </Dialog>,
    );

    expect(markup).toContain("<dialog");
    expect(markup).not.toMatch(/<dialog[^>]*\sopen[\s>]/);
    expect(markup).toContain('aria-labelledby="sample-title"');
    expect(markup).toContain("نمونه");
    expect(markup).toContain("بستن");
    expect(markup).toContain("محتوا");
  });

  it("widens for the list size variant", () => {
    const markup = renderToStaticMarkup(
      <Dialog
        open={false}
        onClose={noop}
        titleId="list-title"
        title="نمونه"
        size="list"
      >
        <p>محتوا</p>
      </Dialog>,
    );

    expect(markup).toMatch(/class="[^"]*list[^"]*"/);
  });
});
