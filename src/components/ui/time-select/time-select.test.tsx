import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimeSelect } from "./time-select";

function render(props: Partial<Parameters<typeof TimeSelect>[0]> = {}) {
  return renderToStaticMarkup(
    <TimeSelect
      id="travel-time"
      name="requestedTravelTime"
      label="ساعت"
      {...props}
    />,
  );
}

describe("TimeSelect", () => {
  it("submits canonical HH:mm and shows Persian digits on a single control", () => {
    const markup = render({ defaultValue: "09:05" });

    expect(markup).toContain('type="hidden"');
    expect(markup).toContain('name="requestedTravelTime"');
    expect(markup).toContain('value="09:05"');
    expect(markup).toContain("۰۹:۰۵");
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("<select");
    expect(markup).toContain(">ساعت<");
  });

  it("prompts for a selection while the time is untouched", () => {
    const markup = render();

    expect(markup).toContain("انتخاب ساعت");
    expect(markup).toContain('value=""');
  });

  it("keeps the popover closed until the field is activated", () => {
    const markup = render({ defaultValue: "11:30" });

    expect(markup).not.toContain('aria-label="کاهش ساعت"');
    expect(markup).not.toContain("پاک کردن");
  });

  it("disables the trigger with the rest of a submitting form", () => {
    expect(render({ disabled: true })).toContain("disabled");
  });
});
