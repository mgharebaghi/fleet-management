import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FuelType } from "../../application/catalogs/fuel-type";
import type { VehicleBrand } from "../../application/catalogs/vehicle-brand";
import type { VehicleStatusEntry } from "../../application/catalogs/vehicle-status";
import type { VehicleType } from "../../application/catalogs/vehicle-type";
import type { VehicleModel } from "../../application/catalogs/vehicle-model";
import { FleetCatalogsPage } from "./fleet-catalogs-page";

const {
  executeListVehicleBrands,
  makeListVehicleBrands,
  makeCreateVehicleBrand,
  executeListVehicleTypes,
  makeListVehicleTypes,
  makeCreateVehicleType,
  executeListFuelTypes,
  makeListFuelTypes,
  makeCreateFuelType,
  executeListVehicleStatuses,
  makeListVehicleStatuses,
  makeCreateVehicleStatus,
  executeListVehicleModels,
  makeListVehicleModels,
  makeCreateVehicleModel,
  revalidatePath,
} = vi.hoisted(() => ({
  executeListVehicleBrands: vi.fn(),
  makeListVehicleBrands: vi.fn(),
  makeCreateVehicleBrand: vi.fn(),
  executeListVehicleTypes: vi.fn(),
  makeListVehicleTypes: vi.fn(),
  makeCreateVehicleType: vi.fn(),
  executeListFuelTypes: vi.fn(),
  makeListFuelTypes: vi.fn(),
  makeCreateFuelType: vi.fn(),
  executeListVehicleStatuses: vi.fn(),
  makeListVehicleStatuses: vi.fn(),
  makeCreateVehicleStatus: vi.fn(),
  executeListVehicleModels: vi.fn(),
  makeListVehicleModels: vi.fn(),
  makeCreateVehicleModel: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("../../composition/catalogs/vehicle-brand.factory", () => ({
  makeListVehicleBrands,
  makeCreateVehicleBrand,
}));
vi.mock("../../composition/catalogs/vehicle-type.factory", () => ({
  makeListVehicleTypes,
  makeCreateVehicleType,
}));
vi.mock("../../composition/catalogs/fuel-type.factory", () => ({
  makeListFuelTypes,
  makeCreateFuelType,
}));
vi.mock("../../composition/catalogs/vehicle-status.factory", () => ({
  makeListVehicleStatuses,
  makeCreateVehicleStatus,
}));
vi.mock("../../composition/catalogs/vehicle-model.factory", () => ({
  makeListVehicleModels,
  makeCreateVehicleModel,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const vehicleBrands: VehicleBrand[] = [{ id: 1, name: "Volvo", isActive: true }];
const vehicleTypes: VehicleType[] = [{ id: 1, name: "کامیون", isActive: true }];
const fuelTypes: FuelType[] = [{ id: 1, name: "بنزین", isActive: false }];
const vehicleStatuses: VehicleStatusEntry[] = [{ id: 1, name: "در سرویس" }];
const vehicleModels: VehicleModel[] = [
  {
    id: 1,
    name: "FH",
    isActive: true,
    brand: { id: 1, name: "Volvo" },
    vehicleType: { id: 1, name: "کامیون" },
    fuelType: null,
  },
];

async function renderPage() {
  return renderToStaticMarkup(await FleetCatalogsPage());
}

describe("FleetCatalogsPage", () => {
  beforeEach(() => {
    executeListVehicleBrands.mockReset().mockResolvedValue(vehicleBrands);
    executeListVehicleTypes.mockReset().mockResolvedValue(vehicleTypes);
    executeListFuelTypes.mockReset().mockResolvedValue(fuelTypes);
    executeListVehicleStatuses.mockReset().mockResolvedValue(vehicleStatuses);
    executeListVehicleModels.mockReset().mockResolvedValue(vehicleModels);
    makeListVehicleBrands.mockReset().mockReturnValue({
      execute: executeListVehicleBrands,
    });
    makeListVehicleTypes.mockReset().mockReturnValue({
      execute: executeListVehicleTypes,
    });
    makeListFuelTypes.mockReset().mockReturnValue({
      execute: executeListFuelTypes,
    });
    makeListVehicleStatuses.mockReset().mockReturnValue({
      execute: executeListVehicleStatuses,
    });
    makeListVehicleModels.mockReset().mockReturnValue({
      execute: executeListVehicleModels,
    });
  });

  it("renders the simple catalogs and the dedicated vehicle-model summary", async () => {
    const markup = await renderPage();

    expect(markup).toContain('lang="fa"');
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain("برند خودرو");
    expect(markup).toContain("Volvo");
    expect(markup).toContain("نوع خودرو");
    expect(markup).toContain("کامیون");
    expect(markup).toContain("نوع سوخت");
    expect(markup).toContain("بنزین");
    expect(markup).toContain("وضعیت خودرو");
    expect(markup).toContain("در سرویس");
    expect(markup.match(/۱ مورد ثبت‌شده/g)).toHaveLength(4);
    expect(markup).toContain("مدل خودرو");
    expect(markup).toContain("FH");
    expect(markup).toContain("۱ مدل ثبت‌شده");
  });

  it("does not show a redundant active badge, but shows an inactive badge and count for the fuel-type catalog", async () => {
    const markup = await renderPage();
    const simpleCatalogMarkup = markup.split(
      'aria-labelledby="vehicle-model-title"',
    )[0];

    expect(simpleCatalogMarkup).not.toMatch(/>فعال</);
    expect(simpleCatalogMarkup).toContain("غیرفعال");
    expect(simpleCatalogMarkup).toContain("۱ مورد غیرفعال");
  });

  it("keeps every catalog's create and view-all dialogs closed by default", async () => {
    const markup = await renderPage();

    const dialogTags = markup.match(/<dialog[^>]*>/g) ?? [];
    expect(dialogTags).toHaveLength(10);
    for (const dialogTag of dialogTags) {
      expect(dialogTag).not.toMatch(/\sopen[\s>]/);
    }
    expect(markup).toContain("+ افزودن");
    expect(markup).toContain("مشاهده همه");
  });

  it("does not render a permanent list or create form on the main page body", async () => {
    const markup = await renderPage();
    const outsideDialogs = markup.split("<dialog")[0];

    expect(outsideDialogs).not.toContain("<form");
    expect(outsideDialogs).not.toContain("Volvo");
  });

  it("renders empty states for catalogs with no entries", async () => {
    executeListVehicleBrands.mockResolvedValue([]);

    const markup = await renderPage();

    expect(markup).toContain("هنوز برندی ثبت نشده است.");
  });

  it("renders an error state for a catalog whose list fails to load without failing the whole page", async () => {
    executeListFuelTypes.mockRejectedValue(new Error("SQL connection failed"));

    const markup = await renderPage();

    expect(markup).toContain("دریافت فهرست امکان‌پذیر نبود");
    expect(markup).not.toContain("SQL connection failed");
    expect(markup).toContain("Volvo");
    expect(markup).toContain("در سرویس");
    expect(markup).toContain("FH");
  });

  it("isolates a vehicle-model load failure from the simple catalogs", async () => {
    executeListVehicleModels.mockRejectedValue(new Error("SQL connection failed"));

    const markup = await renderPage();

    expect(markup).toContain("دریافت فهرست مدل‌های خودرو امکان‌پذیر نبود");
    expect(markup).not.toContain("SQL connection failed");
    expect(markup).toContain("Volvo");
  });
});
