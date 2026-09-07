import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Person } from "../../../application/person";
import { UpdatePersonForm } from "./update-person-form";

vi.mock("../action/update-person.action", () => ({
  updatePersonAction: vi.fn(),
}));

const person: Person = {
  personId: 42,
  personnelNo: "P-100",
  firstName: "Ali",
  lastName: "Ahmadi",
  nationalCode: "0012345679",
  cardNo: "C-100",
  mobile: "09120000000",
  employmentDate: new Date("2026-01-10T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2026-01-11T08:00:00.000Z"),
};

describe("UpdatePersonForm", () => {
  it("preloads every field with the person's current values", () => {
    const markup = renderToStaticMarkup(<UpdatePersonForm person={person} />);

    expect(markup).toContain('lang="fa"');
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('name="personId"');
    expect(markup).toContain('value="42"');
    expect(markup).toMatch(/name="firstName"[^>]*value="Ali"/);
    expect(markup).toMatch(/name="lastName"[^>]*value="Ahmadi"/);
    expect(markup).toMatch(/name="nationalCode"[^>]*value="0012345679"/);
    expect(markup).toMatch(/name="cardNo"[^>]*value="C-100"/);
    expect(markup).toMatch(/name="mobile"[^>]*value="09120000000"/);
  });

  it("preloads the active checkbox as checked for an active person", () => {
    const markup = renderToStaticMarkup(<UpdatePersonForm person={person} />);

    expect(markup).toMatch(/name="isActive"[^>]*checked=""/);
  });

  it("leaves the active checkbox unchecked for an inactive person", () => {
    const markup = renderToStaticMarkup(
      <UpdatePersonForm person={{ ...person, isActive: false }} />,
    );

    expect(markup).not.toMatch(/name="isActive"[^>]*checked=""/);
  });

  it("renders a cancel link back to the people list, named for assistive technology", () => {
    const markup = renderToStaticMarkup(<UpdatePersonForm person={person} />);

    // Icon-only control: the destination lives in its accessible name.
    expect(markup).toMatch(
      /<a(?=[^>]*href="\/people")(?=[^>]*aria-label="انصراف و بازگشت به اشخاص")[^>]*>/,
    );
  });
});
