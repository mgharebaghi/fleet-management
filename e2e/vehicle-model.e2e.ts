import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import type { E2EDatabaseAdapter } from "./support/e2e-database";
import { connectToE2EDatabase } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";

let e2eDatabaseAdapter: E2EDatabaseAdapter;
const createdVehicleModelNames = new Set<string>();
const createdBrandIds = new Set<number>();
const createdVehicleTypeIds = new Set<number>();
const createdFuelTypeIds = new Set<number>();

function uniqueName(label: string): string {
  return `E2E-VM-${label}-${randomUUID().slice(0, 8)}`;
}

async function createVehicleBrand(name: string): Promise<number> {
  const result = await e2eDatabaseAdapter
    .underlyingDriver()
    .request()
    .input("name", name)
    .query<{ BrandId: number }>(
      `INSERT INTO fleet.VehicleBrand (BrandName)
       OUTPUT INSERTED.BrandId
       VALUES (@name)`,
    );
  const id = result.recordset[0].BrandId;
  createdBrandIds.add(id);
  return id;
}

async function createVehicleType(name: string): Promise<number> {
  const result = await e2eDatabaseAdapter
    .underlyingDriver()
    .request()
    .input("name", name)
    .query<{ VehicleTypeId: number }>(
      `INSERT INTO fleet.VehicleType (TypeName)
       OUTPUT INSERTED.VehicleTypeId
       VALUES (@name)`,
    );
  const id = result.recordset[0].VehicleTypeId;
  createdVehicleTypeIds.add(id);
  return id;
}

async function createFuelType(name: string): Promise<number> {
  const result = await e2eDatabaseAdapter
    .underlyingDriver()
    .request()
    .input("name", name)
    .query<{ FuelTypeId: number }>(
      `INSERT INTO fleet.FuelType (FuelTypeName)
       OUTPUT INSERTED.FuelTypeId
       VALUES (@name)`,
    );
  const id = result.recordset[0].FuelTypeId;
  createdFuelTypeIds.add(id);
  return id;
}

async function deleteRowsByIds(
  table: "VehicleBrand" | "VehicleType" | "FuelType",
  idColumn: "BrandId" | "VehicleTypeId" | "FuelTypeId",
  ids: Set<number>,
): Promise<void> {
  for (const id of ids) {
    await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .input("id", id)
      .query(`DELETE FROM fleet.${table} WHERE ${idColumn} = @id`);
  }
  ids.clear();
}

test.describe.serial("Vehicle Model Catalog", () => {
  test.beforeAll(async () => {
    e2eDatabaseAdapter = await connectToE2EDatabase();
  });

  test.afterEach(async () => {
    for (const modelName of createdVehicleModelNames) {
      await e2eDatabaseAdapter
        .underlyingDriver()
        .request()
        .input("modelName", modelName)
        .query(
          "DELETE FROM fleet.VehicleModel WHERE ModelName = @modelName",
        );
    }
    createdVehicleModelNames.clear();

    await deleteRowsByIds("VehicleBrand", "BrandId", createdBrandIds);
    await deleteRowsByIds(
      "VehicleType",
      "VehicleTypeId",
      createdVehicleTypeIds,
    );
    await deleteRowsByIds("FuelType", "FuelTypeId", createdFuelTypeIds);
  });

  test.afterAll(async () => {
    if (e2eDatabaseAdapter) {
      await e2eDatabaseAdapter.dispose();
    }
  });

  test("creates a model with selected relations and immediately shows it in the list", async ({
    page,
  }) => {
    const modelName = uniqueName("Model");
    const brandName = uniqueName("Brand");
    const vehicleTypeName = uniqueName("Type");
    const fuelTypeName = uniqueName("Fuel");
    createdVehicleModelNames.add(modelName);

    const brandId = await createVehicleBrand(brandName);
    const vehicleTypeId = await createVehicleType(vehicleTypeName);
    const fuelTypeId = await createFuelType(fuelTypeName);

    await page.goto("/fleet/catalogs");
    const modelCard = page.getByRole("region", { name: "مدل خودرو" });

    await modelCard.getByRole("button", { name: "ایجاد مدل" }).click();
    const createDialog = page.getByRole("dialog", {
      name: "ایجاد مدل خودرو",
    });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("نام مدل").fill(modelName);
    await selectSearchableOption(createDialog, "برند", brandName, brandName);
    await selectSearchableOption(createDialog, "نوع خودرو", vehicleTypeName, vehicleTypeName);
    await selectSearchableOption(createDialog, "نوع سوخت", fuelTypeName, fuelTypeName);
    await createDialog.getByRole("button", { name: "ایجاد مدل" }).click();

    await expect(createDialog).toBeHidden({ timeout: 10_000 });

    // The dialog stays mounted across close/reopen, so a prior selection
    // must not survive the create action's native form.reset() call.
    await modelCard.getByRole("button", { name: "ایجاد مدل" }).click();
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByLabel("نام مدل")).toHaveValue("");
    const referenceSelections: Array<[string, string]> = [
      ["برند", brandName],
      ["نوع خودرو", vehicleTypeName],
      ["نوع سوخت", fuelTypeName],
    ];
    for (const [label, previousSelection] of referenceSelections) {
      const trigger = createDialog.getByLabel(label, { exact: true });
      await expect(trigger).toContainText("انتخاب کنید");
      await expect(trigger).not.toContainText(previousSelection);
    }
    await createDialog.getByRole("button", { name: "انصراف" }).click();
    await expect(createDialog).toBeHidden();

    await modelCard.getByRole("button", { name: "مشاهده همه" }).click();
    const listDialog = page.getByRole("dialog", { name: "مدل‌های خودرو" });
    await expect(listDialog).toBeVisible();
    await expect(listDialog.locator("table")).toBeVisible();
    await expect(listDialog.getByText(modelName).first()).toBeVisible();
    await expect(listDialog.getByText(brandName).first()).toBeVisible();
    await expect(listDialog.getByText(vehicleTypeName).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(listDialog.locator("table")).toBeHidden();
    await expect(listDialog.locator("ul")).toBeVisible();

    const mobileLayout = await page.evaluate(() => {
      const openDialog = document.querySelector("dialog[open]");
      const dialogRect = openDialog?.getBoundingClientRect();

      return {
        hasHorizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        dialogInsideViewport:
          dialogRect !== undefined &&
          dialogRect.left >= 0 &&
          dialogRect.right <= window.innerWidth &&
          dialogRect.top >= 0 &&
          dialogRect.bottom <= window.innerHeight,
      };
    });

    expect(mobileLayout).toEqual({
      hasHorizontalOverflow: false,
      dialogInsideViewport: true,
    });

    const persistedModels = await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .input("modelName", modelName)
      .query<{
        ModelName: string;
        BrandId: number;
        VehicleTypeId: number | null;
        FuelTypeId: number | null;
        IsActive: boolean;
      }>(
        `SELECT ModelName, BrandId, VehicleTypeId, FuelTypeId, IsActive
         FROM fleet.VehicleModel
         WHERE ModelName = @modelName`,
      );

    expect(persistedModels.recordset).toEqual([
      {
        ModelName: modelName,
        BrandId: brandId,
        VehicleTypeId: vehicleTypeId,
        FuelTypeId: fuelTypeId,
        IsActive: true,
      },
    ]);
  });

  test("shows the Persian required-name error without closing the dialog", async ({
    page,
  }) => {
    const brandName = uniqueName("Brand");
    const vehicleTypeName = uniqueName("Type");
    const fuelTypeName = uniqueName("Fuel");
    await createVehicleBrand(brandName);
    await createVehicleType(vehicleTypeName);
    await createFuelType(fuelTypeName);

    await page.goto("/fleet/catalogs");
    const modelCard = page.getByRole("region", { name: "مدل خودرو" });
    await modelCard.getByRole("button", { name: "ایجاد مدل" }).click();
    const createDialog = page.getByRole("dialog", {
      name: "ایجاد مدل خودرو",
    });
    await selectSearchableOption(createDialog, "برند", brandName, brandName);
    await selectSearchableOption(createDialog, "نوع خودرو", vehicleTypeName, vehicleTypeName);
    await selectSearchableOption(createDialog, "نوع سوخت", fuelTypeName, fuelTypeName);
    await createDialog.getByRole("button", { name: "ایجاد مدل" }).click();

    await expect(createDialog.getByText("نام مدل الزامی است.")).toBeVisible();
    await expect(createDialog).toBeVisible();
  });
});
