import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VehicleInsuranceSummary } from "../../../application/vehicle-insurances/vehicle-insurance";
import { ListVehicleInsurancesPage } from "./list-vehicle-insurances-page";

const { list } = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("../../../composition/vehicle-insurances/vehicle-insurance.factory", () => ({
  makeListVehicleInsurances: () => ({ execute: list }),
}));

vi.mock("./list-vehicle-insurances-filters", () => ({
  ListVehicleInsurancesFilters: () => <div data-testid="list-vehicle-insurances-filters" />,
}));

function vehicle(overrides: Partial<VehicleInsuranceSummary["vehicle"]> = {}): VehicleInsuranceSummary["vehicle"] {
  return {
    vehicleId: 1, vehicleCode: "V-1", brandName: "ایران‌خودرو", modelName: "پراید ۱۱۱",
    plateNoLeftSide: "12", plateNoCenterChar: "الف", plateNoRightSide: "345", plateNoIranNo: "67",
    isActive: true, ...overrides,
  };
}

function insurance(overrides: Partial<VehicleInsuranceSummary> = {}): VehicleInsuranceSummary {
  return {
    vehicleInsuranceId: "1", vehicleId: 1, insuranceType: "شخص ثالث", insuranceCompany: "بیمه البرز",
    policyNo: "POL-1", startDate: new Date("2024-03-20"), expireDate: new Date("2025-03-20"),
    premiumAmount: "1000000", coverageAmount: "5000000", isActive: true, vehicle: vehicle(), ...overrides,
  };
}

async function renderList(result: { insurances: VehicleInsuranceSummary[]; totalCount: number }) {
  list.mockResolvedValue(result);
  return renderToStaticMarkup(await ListVehicleInsurancesPage({ searchParams: {} }));
}

/** Isolates the desktop `<table>` markup from the mobile record cards rendered alongside it. */
function desktopTableMarkup(markup: string): string {
  const start = markup.indexOf("<table");
  const end = markup.indexOf("</table>") + "</table>".length;
  return markup.slice(start, end);
}

describe("ListVehicleInsurancesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("groups columns into five headers instead of one per field", async () => {
    const markup = await renderList({ insurances: [insurance()], totalCount: 1 });

    expect((markup.match(/<th scope="col">/g) ?? [])).toHaveLength(5);
    expect(markup).toContain(">خودرو<");
    expect(markup).toContain(">بیمه‌نامه<");
    expect(markup).toContain(">دوره بیمه<");
    expect(markup).toContain(">مبالغ<");
    expect(markup).toContain(">وضعیت رکورد<");
  });

  it("shows the vehicle's brand, model and plate in the desktop table, without its vehicle id", async () => {
    const markup = await renderList({ insurances: [insurance({ vehicle: vehicle({ vehicleId: 42 }) })], totalCount: 1 });

    expect(markup).toContain("ایران‌خودرو");
    expect(markup).toContain("پراید ۱۱۱");
    expect(markup).toContain("ایران"); // VehiclePlate's plate box renders this label.
    expect(markup).not.toContain(">42<");
  });

  it("shows the vehicle code in the desktop table only when two vehicles share brand, model and plate", async () => {
    const uniqueMarkup = await renderList({ insurances: [insurance({ vehicle: vehicle({ vehicleCode: "SOLO-1" }) })], totalCount: 1 });
    expect(desktopTableMarkup(uniqueMarkup)).not.toContain("SOLO-1");

    const ambiguousMarkup = await renderList({
      insurances: [
        insurance({ vehicleInsuranceId: "1", vehicle: vehicle({ vehicleId: 1, vehicleCode: "DUP-1" }) }),
        insurance({ vehicleInsuranceId: "2", vehicle: vehicle({ vehicleId: 2, vehicleCode: "DUP-2" }) }),
      ],
      totalCount: 2,
    });
    expect(desktopTableMarkup(ambiguousMarkup)).toContain("DUP-1");
    expect(desktopTableMarkup(ambiguousMarkup)).toContain("DUP-2");
  });

  it("keeps the mobile record cards with their existing per-field labels", async () => {
    const markup = await renderList({ insurances: [insurance()], totalCount: 1 });

    expect(markup).toContain("شرکت بیمه");
    expect(markup).toContain("شماره بیمه‌نامه");
    expect(markup).toContain("حق بیمه (تومان)");
    expect(markup).toContain("سقف پوشش (تومان)");
  });
});
