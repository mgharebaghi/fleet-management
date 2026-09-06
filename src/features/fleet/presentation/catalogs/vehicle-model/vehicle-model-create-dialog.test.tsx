import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { VehicleModelCreateDialog, buildReferenceOptions } from "./vehicle-model-create-dialog";

const noop = () => {};
const noopAction = vi.fn();

function renderDialog(
  overrides: Partial<Parameters<typeof VehicleModelCreateDialog>[0]> = {},
) {
  return renderToStaticMarkup(
    <VehicleModelCreateDialog
      open={false}
      onClose={noop}
      brands={[
        { id: 1, name: "Volvo", isActive: true },
        { id: 2, name: "Old Brand", isActive: false },
      ]}
      vehicleTypes={[{ id: 3, name: "کامیون", isActive: true }]}
      fuelTypes={[{ id: 4, name: "دیزل", isActive: true }]}
      hasReferenceLoadError={false}
      action={noopAction}
      {...overrides}
    />,
  );
}

describe("VehicleModelCreateDialog", () => {
  it("renders a labeled name input and a searchable brand field", () => {
    const markup = renderDialog();

    expect(markup).toContain("ایجاد مدل خودرو");
    expect(markup).toMatch(/<label[^>]*for="vehicle-model-name"[^>]*>نام مدل/);
    expect(markup).toMatch(/<input(?=[^>]*name="name")(?=[^>]*autofocus)[^>]*>/);
    // The brand/type/fuel pickers submit through a hidden field, not a native select.
    expect(markup).toContain('type="hidden"');
    expect(markup).toContain('name="brandId"');
    expect(markup).not.toContain("<select");
  });

  it("renders brand, type and fuel as searchable pickers with a placeholder", () => {
    const markup = renderDialog();

    expect(markup).not.toContain("اختیاری");
    expect(markup).toContain('name="vehicleTypeId"');
    expect(markup).toContain('name="fuelTypeId"');
    // Once per picker's placeholder, plus once in the dialog's own description text.
    expect(markup.match(/انتخاب کنید/g)).toHaveLength(4);
  });

  it("keeps inactive reference options visible and identifies them", () => {
    const [active, inactive] = buildReferenceOptions([
      { id: 1, name: "Volvo", isActive: true },
      { id: 2, name: "Old Brand", isActive: false },
    ]);

    expect(active.label).toBe("Volvo");
    expect(inactive.label).toBe("Old Brand (غیرفعال)");
  });

  it("shows a safe error and disables submission when references fail to load", () => {
    const markup = renderDialog({ hasReferenceLoadError: true });

    expect(markup).toContain("دریافت گزینه‌های فرم امکان‌پذیر نبود");
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });
});
