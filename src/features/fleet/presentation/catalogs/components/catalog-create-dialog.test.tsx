import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CatalogCreateDialog } from "./catalog-create-dialog";

const noopAction = vi.fn();
const noop = () => {};

function renderDialog(
  overrides: Partial<Parameters<typeof CatalogCreateDialog>[0]> = {},
) {
  return renderToStaticMarkup(
    <CatalogCreateDialog
      open={false}
      onClose={noop}
      fieldId="vehicle-brand-name"
      title="برند خودرو"
      nameLabel="نام برند"
      submitLabel="ثبت برند"
      submitPendingLabel="در حال ثبت…"
      duplicateMessage="این نام برند قبلاً ثبت شده است."
      action={noopAction}
      {...overrides}
    />,
  );
}

describe("CatalogCreateDialog", () => {
  it("renders a closed, titled dialog with a labeled, required, auto-focused name input", () => {
    const markup = renderDialog();

    expect(markup).toContain("<dialog");
    expect(markup).not.toMatch(/<dialog[^>]*\sopen[\s>]/);
    expect(markup).toContain("افزودن برند خودرو");
    expect(markup).toMatch(
      /<label[^>]*>نام برند<\/label>/,
    );
    expect(markup).toMatch(
      /<input(?=[^>]*name="name")(?=[^>]*required)(?=[^>]*autofocus)[^>]*>/,
    );
  });

  it("renders cancel and submit actions", () => {
    const markup = renderDialog();

    expect(markup).toContain("انصراف");
    expect(markup).toContain("ثبت برند");
  });
});
