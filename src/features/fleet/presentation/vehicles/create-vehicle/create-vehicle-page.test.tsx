import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildModelOptions } from "./create-vehicle-form";
import { CreateVehiclePage } from "./create-vehicle-page";

const { models, statuses } = vi.hoisted(() => ({
  models: vi.fn(),
  statuses: vi.fn(),
}));

vi.mock("../../../composition/catalogs/vehicle-model.factory", () => ({
  makeListVehicleModels: () => ({ execute: models }),
}));
vi.mock("../../../composition/catalogs/vehicle-status.factory", () => ({
  makeListVehicleStatuses: () => ({ execute: statuses }),
}));
vi.mock("./create-vehicle.action", () => ({ createVehicleAction: vi.fn() }));

describe("CreateVehiclePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    statuses.mockResolvedValue([{ id: 1, name: "آماده به کار" }]);
  });

  it("distinguishes absent references from reference fetch errors", async () => {
    models.mockResolvedValue([]);
    expect(renderToStaticMarkup(await CreateVehiclePage())).toContain(
      "ابتدا مدل خودرو و وضعیت عملیاتی",
    );

    models.mockRejectedValue(new Error("private"));
    const markup = renderToStaticMarkup(await CreateVehiclePage());

    expect(markup).toContain("دریافت مدل‌ها و وضعیت‌ها امکان‌پذیر نبود");
    expect(markup).not.toContain("private");
  });

  it("marks an inactive model in its searchable picker option", () => {
    const [option] = buildModelOptions([
      {
        id: 9,
        name: "Legacy",
        isActive: false,
        brand: { id: 1, name: "Brand" },
        vehicleType: null,
        fuelType: null,
      },
    ]);

    expect(option.label).toContain("غیرفعال");
  });

  it("renders the form with a searchable model picker, RTL and explicit plate ordering", async () => {
    models.mockResolvedValue([
      {
        id: 9,
        name: "Legacy",
        isActive: false,
        brand: { id: 1, name: "Brand" },
        vehicleType: null,
        fuelType: null,
      },
    ]);

    const markup = renderToStaticMarkup(await CreateVehiclePage());

    // Migrated off the native <select>: the picker submits through a hidden field.
    expect(markup).not.toContain("<select");
    expect(markup).toContain('name="modelId"');
    expect(markup).toContain('dir="rtl"');
    expect(markup.indexOf('id="plateNoLeftSide"')).toBeLessThan(
      markup.indexOf('id="plateNoCenterChar"'),
    );
    expect(markup.indexOf('id="plateNoCenterChar"')).toBeLessThan(
      markup.indexOf('id="plateNoRightSide"'),
    );
    expect(markup.indexOf('id="plateNoRightSide"')).toBeLessThan(
      markup.indexOf('id="plateNoIranNo"'),
    );

    for (const name of ["vehicleId", "isActive", "createdAt"]) {
      expect(markup).not.toContain(`name="${name}"`);
    }
  });

  it("names each plate part fully while showing a short caption", async () => {
    models.mockResolvedValue([
      {
        id: 9,
        name: "Legacy",
        isActive: true,
        brand: { id: 1, name: "Brand" },
        vehicleType: null,
        fuelType: null,
      },
    ]);

    const markup = renderToStaticMarkup(await CreateVehiclePage());

    expect(markup).toContain('aria-label="دو رقم سمت چپ"');
    expect(markup).toContain('aria-label="سه رقم سمت راست"');
    expect(markup).toContain('aria-hidden="true">دو رقم<');
  });
});
