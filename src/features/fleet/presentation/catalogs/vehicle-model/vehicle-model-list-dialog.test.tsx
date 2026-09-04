import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import { VehicleModelListDialog } from "./vehicle-model-list-dialog";

const noop = () => {};
const models: VehicleModel[] = [
  {
    id: 1,
    name: "Corolla",
    isActive: true,
    brand: { id: 2, name: "Toyota" },
    vehicleType: { id: 3, name: "سدان" },
    fuelType: null,
  },
  {
    id: 4,
    name: "Legacy",
    isActive: false,
    brand: { id: 5, name: "Volvo" },
    vehicleType: null,
    fuelType: { id: 6, name: "دیزل" },
  },
];

function renderDialog(vehicleModels: VehicleModel[] = models) {
  return renderToStaticMarkup(
    <VehicleModelListDialog
      open={false}
      onClose={noop}
      vehicleModels={vehicleModels}
    />,
  );
}

describe("VehicleModelListDialog", () => {
  it("renders model relations and explicit status text in desktop and mobile views", () => {
    const markup = renderDialog();

    expect(markup).toContain("نام مدل");
    expect(markup).toContain("برند");
    expect(markup).toContain("نوع خودرو");
    expect(markup).toContain("نوع سوخت");
    expect(markup).toContain("Corolla");
    expect(markup).toContain("Toyota");
    expect(markup).toContain("سدان");
    expect(markup).toContain("دیزل");
    expect(markup).toContain("فعال");
    expect(markup).toContain("غیرفعال");
    expect(markup).toContain("—");
  });

  it("uses an accessible table and semantic mobile detail lists", () => {
    const markup = renderDialog();

    expect(markup).toContain("<table");
    expect(markup).toContain("فهرست مدل‌های خودرو");
    expect(markup).toContain('<th scope="col">');
    expect(markup).toContain("<dl");
  });

  it("renders a readable empty state", () => {
    expect(renderDialog([])).toContain("هنوز مدل خودرویی ثبت نشده است.");
  });
});
