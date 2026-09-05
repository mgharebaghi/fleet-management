import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VehicleSummary } from "../../../application/vehicles/vehicle";
import { ListVehiclesPage } from "./list-vehicles-page";

const { list, statuses } = vi.hoisted(() => ({
  list: vi.fn(),
  statuses: vi.fn(),
}));

vi.mock("../../../composition/vehicles/vehicle.factory", () => ({
  makeListVehicles: () => ({ execute: list }),
}));
vi.mock("../../../composition/catalogs/vehicle-status.factory", () => ({
  makeListVehicleStatuses: () => ({ execute: statuses }),
}));

vi.mock("./list-vehicles-filters", () => ({
  ListVehiclesFilters: ({
    initialSearch,
    initialStatus,
    initialActive,
  }: {
    initialSearch: string;
    initialStatus: string;
    initialActive: string;
  }) => (
    <div
      data-testid="list-vehicles-filters"
      data-search={initialSearch}
      data-status={initialStatus}
      data-active={initialActive}
    />
  ),
}));

const vehicle: VehicleSummary = {
  vehicleId: 4,
  vehicleCode: "V-100",
  plateNoLeftSide: "12",
  plateNoCenterChar: "ب",
  plateNoRightSide: "345",
  plateNoIranNo: "67",
  internationalPlateNo: "INT-9",
  vin: "VIN-1234567",
  modelYear: 1402,
  isActive: true,
  model: { id: 2, name: "مدل آزمایشی" },
  brand: { id: 3, name: "برند آزمایشی" },
  vehicleType: { id: 5, name: "سواری" },
  fuelType: { id: 6, name: "بنزین" },
  status: { id: 1, name: "آماده به کار" },
};

async function renderList(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  return renderToStaticMarkup(await ListVehiclesPage({ searchParams }));
}

describe("ListVehiclesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    statuses.mockResolvedValue([{ id: 1, name: "آماده به کار" }]);
    list.mockResolvedValue({ vehicles: [], totalCount: 0 });
  });

  it("distinguishes an empty fleet, filtered empty results and an unavailable list", async () => {
    expect(await renderList()).toContain("هنوز خودرویی ثبت نشده است");
    expect(await renderList({ search: "absent" })).toContain(
      "خودرویی مطابق جستجو یا فیلتر پیدا نشد",
    );

    list.mockRejectedValue(new Error("private"));
    const markup = await renderList();

    expect(markup).toContain("دریافت اطلاعات خودروها امکان‌پذیر نبود");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("private");
  });

  it("keeps operational and active filters separate and passes the URL page", async () => {
    await renderList({
      status: "7",
      active: "inactive",
      page: "2",
      search: "V-2",
    });

    expect(list).toHaveBeenCalledWith({
      search: "V-2",
      pageNumber: 2,
      isActive: false,
      vehicleStatusId: 7,
    });
  });

  it("hands the URL-derived criteria to the live filters", async () => {
    const markup = await renderList({
      search: "V-2",
      status: "7",
      active: "all",
    });

    expect(markup).toContain('data-search="V-2"');
    expect(markup).toContain('data-status="7"');
    expect(markup).toContain('data-active="all"');
  });

  it("leaves an unusable operational status out of the filters", async () => {
    const markup = await renderList({ status: "not-a-number" });

    expect(markup).toContain('data-status=""');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleStatusId: null }),
    );
  });

  it("filters the listing without any submit control", async () => {
    list.mockResolvedValue({ vehicles: [vehicle], totalCount: 1 });

    const markup = await renderList();

    expect(markup).not.toContain("اعمال جستجو و فیلتر");
    expect(markup).not.toContain("<form");
  });

  it("renders every vehicle detail across the table and the mobile cards", async () => {
    list.mockResolvedValue({ vehicles: [vehicle], totalCount: 1 });

    const markup = await renderList();

    for (const value of [
      "V-100",
      "VIN-1234567",
      "INT-9",
      "برند آزمایشی",
      "مدل آزمایشی",
      "سواری",
      "بنزین",
      "آماده به کار",
      "1402",
    ]) {
      expect(markup).toContain(value);
    }

    // Plate parts keep their printed order inside the RTL page.
    expect(markup.indexOf(">12<")).toBeLessThan(markup.indexOf(">ب<"));
    expect(markup.indexOf(">ب<")).toBeLessThan(markup.indexOf(">345<"));
    expect(markup.indexOf(">345<")).toBeLessThan(markup.indexOf(">ایران<"));
    expect(markup.indexOf(">ایران<")).toBeLessThan(markup.indexOf(">67<"));
  });

  it("paginates only once the results outgrow a single page", async () => {
    list.mockResolvedValue({ vehicles: [vehicle], totalCount: 1 });
    expect(await renderList()).not.toContain("صفحه بعد");

    list.mockResolvedValue({ vehicles: [vehicle], totalCount: 45 });
    const markup = await renderList({ search: "V", active: "all", page: "2" });

    expect(markup).toContain(
      'href="/fleet/vehicles?search=V&amp;active=all&amp;page=1"',
    );
    expect(markup).toContain(
      'href="/fleet/vehicles?search=V&amp;active=all&amp;page=3"',
    );
  });
});
