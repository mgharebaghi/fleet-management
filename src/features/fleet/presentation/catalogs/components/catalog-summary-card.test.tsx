import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CatalogSummaryCard } from "./catalog-summary-card";

const noopAction = vi.fn();

function renderCard(
  overrides: Partial<Parameters<typeof CatalogSummaryCard>[0]> = {},
) {
  return renderToStaticMarkup(
    <CatalogSummaryCard
      fieldId="vehicle-brand-name"
      title="برند خودرو"
      description="توضیحات"
      nameLabel="نام برند"
      submitLabel="ثبت برند"
      submitPendingLabel="در حال ثبت…"
      emptyStateMessage="هنوز برندی ثبت نشده است."
      duplicateMessage="این نام برند قبلاً ثبت شده است."
      entries={[]}
      hasLoadError={false}
      action={noopAction}
      {...overrides}
    />,
  );
}

function markupOutsideDialogs(markup: string) {
  return markup.split("<dialog")[0];
}

describe("CatalogSummaryCard", () => {
  it("renders the title, description, and a total-count summary", () => {
    const markup = renderCard({
      entries: [
        { id: 1, name: "Volvo", isActive: true },
        { id: 2, name: "Scania", isActive: true },
      ],
    });

    expect(markup).toContain("برند خودرو");
    expect(markup).toContain("توضیحات");
    expect(markup).toContain("۲ مورد ثبت‌شده");
  });

  it("does not render any entry preview or list outside the dialogs", () => {
    const markup = renderCard({
      entries: [{ id: 1, name: "Volvo", isActive: true }],
    });

    expect(markupOutsideDialogs(markup)).not.toContain("Volvo");
  });

  it("does not render a permanent create form on the card body", () => {
    const markup = renderCard();

    const outside = markupOutsideDialogs(markup);
    expect(outside).not.toContain("<form");
    expect(outside).not.toContain('name="name"');
  });

  it("renders an add action that opens the create dialog for this catalog", () => {
    const markup = renderCard();

    expect(markup).toContain("+ افزودن");
    expect(markup).toContain("افزودن برند خودرو");
  });

  it("hides the view-all action when there are no entries but still shows add", () => {
    const markup = renderCard({ entries: [] });

    expect(markupOutsideDialogs(markup)).not.toContain("مشاهده همه");
    expect(markup).toContain("+ افزودن");
  });

  it("shows an inactive-count line only when at least one entry is inactive", () => {
    const markup = renderCard({
      entries: [
        { id: 1, name: "Volvo", isActive: true },
        { id: 2, name: "Old Brand", isActive: false },
      ],
    });

    expect(markup).toContain("۲ مورد ثبت‌شده");
    expect(markup).toContain("۱ مورد غیرفعال");
  });

  it("does not show an inactive-count line when every entry is active", () => {
    const markup = renderCard({
      entries: [{ id: 1, name: "Volvo", isActive: true }],
    });

    expect(markup).not.toContain("مورد غیرفعال");
  });

  it("does not show an inactive-count line for catalogs without isActive, such as VehicleStatus", () => {
    const markup = renderCard({
      fieldId: "vehicle-status-name",
      title: "وضعیت خودرو",
      nameLabel: "نام وضعیت",
      submitLabel: "ثبت وضعیت",
      emptyStateMessage: "هنوز وضعیتی ثبت نشده است.",
      duplicateMessage: "این وضعیت قبلاً ثبت شده است.",
      entries: [{ id: 1, name: "در سرویس" }],
    });

    expect(markup).not.toContain("مورد غیرفعال");
  });

  it("shows the view-all action once there is at least one entry", () => {
    const markup = renderCard({
      entries: [{ id: 1, name: "Volvo", isActive: true }],
    });

    expect(markup).toContain("مشاهده همه");
  });

  it("keeps both the create and view-all dialogs closed by default", () => {
    const markup = renderCard({
      entries: [{ id: 1, name: "Volvo", isActive: true }],
    });

    const dialogTags = markup.match(/<dialog[^>]*>/g) ?? [];
    expect(dialogTags).toHaveLength(2);
    for (const dialogTag of dialogTags) {
      expect(dialogTag).not.toMatch(/\sopen[\s>]/);
    }
  });

  it("renders an error state instead of the summary and actions when the load failed", () => {
    const markup = renderCard({ hasLoadError: true });

    expect(markup).toContain("دریافت فهرست امکان‌پذیر نبود");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("<dialog");
  });
});
