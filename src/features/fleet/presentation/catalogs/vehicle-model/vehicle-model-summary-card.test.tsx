import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import { VehicleModelSummaryCard } from "./vehicle-model-summary-card";

const noopAction = vi.fn();
const models: VehicleModel[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  name: `Model ${index + 1}`,
  isActive: index !== 4,
  brand: { id: 10, name: `Brand ${index + 1}` },
  vehicleType: { id: 20, name: `Type ${index + 1}` },
  fuelType: { id: 30, name: `Fuel ${index + 1}` },
}));

function renderCard(
  overrides: Partial<Parameters<typeof VehicleModelSummaryCard>[0]> = {},
) {
  return renderToStaticMarkup(
    <VehicleModelSummaryCard
      vehicleModels={models}
      brands={[]}
      vehicleTypes={[]}
      fuelTypes={[]}
      hasLoadError={false}
      hasReferenceLoadError={false}
      action={noopAction}
      {...overrides}
    />,
  );
}

describe("VehicleModelSummaryCard", () => {
  it("renders the total, inactive count, and no more than four concise previews", () => {
    const markup = renderCard();
    const outsideDialogs = markup.split("<dialog")[0];

    expect(outsideDialogs).toContain("مدل خودرو");
    expect(outsideDialogs).toContain("۵ مدل ثبت‌شده");
    expect(outsideDialogs).toContain("۱ مدل غیرفعال");
    expect(outsideDialogs).toContain("Model 1");
    expect(outsideDialogs).toContain("Model 4");
    expect(outsideDialogs).not.toContain("Model 5");
  });

  it("shows brand, vehicle type, and fuel type for each preview model", () => {
    const markup = renderCard();
    const outsideDialogs = markup.split("<dialog")[0];

    expect(outsideDialogs).toContain("Brand 1");
    expect(outsideDialogs).toContain("Type 1");
    expect(outsideDialogs).toContain("Fuel 1");
    expect(outsideDialogs).toContain("Brand 4");
    expect(outsideDialogs).toContain("Type 4");
    expect(outsideDialogs).toContain("Fuel 4");
    expect(outsideDialogs).not.toContain("Brand 5");
    expect(outsideDialogs).not.toContain("Type 5");
    expect(outsideDialogs).not.toContain("Fuel 5");
  });

  it("falls back to a dash for nullable vehicle type and fuel type without crashing", () => {
    expect(() =>
      renderCard({
        vehicleModels: [
          {
            id: 1,
            name: "FH",
            isActive: true,
            brand: { id: 1, name: "Volvo" },
            vehicleType: null,
            fuelType: null,
          },
        ],
      }),
    ).not.toThrow();

    const markup = renderCard({
      vehicleModels: [
        {
          id: 1,
          name: "FH",
          isActive: true,
          brand: { id: 1, name: "Volvo" },
          vehicleType: null,
          fuelType: null,
        },
      ],
    });
    const outsideDialogs = markup.split("<dialog")[0];

    expect(outsideDialogs).toContain("FH");
    expect(outsideDialogs).toContain("Volvo");
    expect(outsideDialogs).toContain("—");
  });

  it("does not show model IDs or status detail in the preview", () => {
    const markup = renderCard();
    const outsideDialogs = markup.split("<dialog")[0];
    const previewSection = outsideDialogs.split("_preview_")[1] ?? "";

    expect(previewSection).not.toContain("فعال");
    expect(previewSection).not.toContain("غیرفعال");
  });

  it("labels the preview and lays out info/preview as two side-by-side regions", () => {
    const markup = renderCard();
    const outsideDialogs = markup.split("<dialog")[0];

    expect(outsideDialogs).toContain("مدل‌های اخیر");
    expect(outsideDialogs).toMatch(/class="_body_/);
    expect(outsideDialogs).toMatch(/class="_info_/);
    expect(outsideDialogs).toMatch(/class="_preview_/);
  });

  it("omits the preview label when there are no models to preview", () => {
    const markup = renderCard({ vehicleModels: [] });

    expect(markup).not.toContain("مدل‌های اخیر");
  });

  it("renders dedicated create and view-all actions", () => {
    const markup = renderCard();

    expect(markup).toContain("ایجاد مدل");
    expect(markup).toContain("مشاهده همه");
    expect(markup.match(/<dialog/g)).toHaveLength(2);
  });

  it("renders an empty summary while preserving both actions", () => {
    const markup = renderCard({ vehicleModels: [] });

    expect(markup).toContain("هنوز مدل خودرویی ثبت نشده است.");
    expect(markup).toContain("ایجاد مدل");
    expect(markup).toContain("مشاهده همه");
  });

  it("renders a bounded error state when loading models fails", () => {
    const markup = renderCard({ hasLoadError: true });

    expect(markup).toContain("دریافت فهرست مدل‌های خودرو امکان‌پذیر نبود");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("<dialog");
  });
});
