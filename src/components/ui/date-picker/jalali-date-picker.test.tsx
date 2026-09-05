import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalaliDatePicker } from "./jalali-date-picker";

function render(props: Partial<Parameters<typeof JalaliDatePicker>[0]> = {}) {
  return renderToStaticMarkup(
    <JalaliDatePicker
      name="employmentDate"
      label="تاریخ استخدام (شمسی)"
      {...props}
    />,
  );
}

describe("JalaliDatePicker", () => {
  it("submits a Gregorian value through a field the user cannot type into", () => {
    const markup = render({ defaultValue: "2024-03-20" });

    expect(markup).toContain('type="hidden"');
    expect(markup).toContain('name="employmentDate"');
    expect(markup).toContain('value="2024-03-20"');
    // The only text input a date field used to have is gone.
    expect(markup).not.toContain('type="text"');
  });

  it("shows the selected date to the user in Jalali", () => {
    expect(render({ defaultValue: "2024-03-20" })).toContain("۱۴۰۳/۰۱/۰۱");
  });

  it("prompts for a selection while the optional date is untouched", () => {
    const markup = render();

    expect(markup).toContain("انتخاب تاریخ");
    expect(markup).toContain('value=""');
  });

  it("offers a clear action only once a date has been chosen", () => {
    expect(render()).not.toContain("پاک کردن");
    expect(render({ defaultValue: "2024-03-20" })).toContain("پاک کردن");
  });

  it("opens the calendar from an accessible collapsed control", () => {
    const markup = render();

    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('type="button"');
  });

  it("associates a field error without an unsupported aria-invalid button", () => {
    const markup = render({
      invalid: true,
      describedBy: "employmentDate-error",
    });

    expect(markup).toContain('aria-describedby="employmentDate-error"');
    expect(markup).toContain("data-invalid");
    expect(markup).not.toContain('aria-invalid="true"');
  });

  it("disables the control with the rest of a submitting form", () => {
    expect(render({ disabled: true })).toContain("disabled");
  });
});
