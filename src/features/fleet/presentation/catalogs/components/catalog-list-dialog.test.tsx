import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CatalogListDialog } from "./catalog-list-dialog";

const noop = () => {};

function renderDialog(
  overrides: Partial<Parameters<typeof CatalogListDialog>[0]> = {},
) {
  return renderToStaticMarkup(
    <CatalogListDialog
      open={false}
      onClose={noop}
      fieldId="vehicle-brand-name"
      title="برند خودرو"
      entries={[]}
      emptyStateMessage="هنوز برندی ثبت نشده است."
      {...overrides}
    />,
  );
}

describe("CatalogListDialog", () => {
  it("renders every entry without a badge when active", () => {
    const markup = renderDialog({
      entries: [{ id: 1, name: "Volvo", isActive: true }],
    });

    expect(markup).toContain("Volvo");
    expect(markup).not.toContain("غیرفعال");
  });

  it("renders an inactive badge for entries with isActive === false", () => {
    const markup = renderDialog({
      fieldId: "fuel-type-name",
      title: "نوع سوخت",
      entries: [{ id: 1, name: "بنزین", isActive: false }],
    });

    expect(markup).toContain("بنزین");
    expect(markup).toContain("غیرفعال");
  });

  it("renders no active/inactive badge for entries without isActive, such as VehicleStatus", () => {
    const markup = renderDialog({
      fieldId: "vehicle-status-name",
      title: "وضعیت خودرو",
      entries: [{ id: 1, name: "در سرویس" }],
    });

    expect(markup).toContain("در سرویس");
    expect(markup).not.toContain("غیرفعال");
    expect(markup).not.toMatch(/>فعال</);
  });

  it("renders the empty-state message when there are no entries", () => {
    const markup = renderDialog({ entries: [] });

    expect(markup).toContain("هنوز برندی ثبت نشده است.");
  });

  it("shows the catalog title as the dialog title and is closed by default", () => {
    const markup = renderDialog({
      entries: [{ id: 1, name: "Volvo", isActive: true }],
    });

    expect(markup).toContain("برند خودرو");
    expect(markup).not.toMatch(/<dialog[^>]*\sopen[\s>]/);
  });
});
