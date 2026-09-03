import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CreatePersonForm } from "./create-person-form";

vi.mock("../action/create-person.action", () => ({
  createPersonAction: vi.fn(),
}));

describe("CreatePersonForm", () => {
  it("renders the Persian RTL form fields and Jalali date controls", () => {
    const markup = renderToStaticMarkup(<CreatePersonForm />);

    expect(markup).toContain('lang="fa"');
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain("ثبت شخص جدید");
    expect(markup).toContain("تاریخ استخدام (شمسی)");
    expect(markup).toContain('name="personnelNo"');
    expect(markup).toContain('name="firstName"');
    expect(markup).toContain('name="lastName"');
    expect(markup).toContain('name="nationalCode"');
    expect(markup).toContain('name="cardNo"');
    expect(markup).toContain('name="mobile"');
    expect(markup).toContain('name="employmentDate"');
    expect(markup).toContain("ثبت شخص");
  });

  it("renders a cancel link back to the people list", () => {
    const markup = renderToStaticMarkup(<CreatePersonForm />);

    expect(markup).toMatch(
      /<a(?=[^>]*href="\/people")[^>]*>انصراف<\/a>/,
    );
  });

  it("renders technical text controls from left to right", () => {
    const markup = renderToStaticMarkup(<CreatePersonForm />);

    for (const fieldName of [
      "personnelNo",
      "nationalCode",
      "cardNo",
      "mobile",
    ]) {
      expect(markup).toMatch(
        new RegExp(
          `<input(?=[^>]*name="${fieldName}")(?=[^>]*dir="ltr")[^>]*>`,
        ),
      );
    }
  });
});
