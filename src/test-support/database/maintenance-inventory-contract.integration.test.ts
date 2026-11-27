import { expect, it } from "vitest";

import expectedContract from "./maintenance-inventory-contract.json";
import { readIsolatedMaintenanceInventoryContract } from "./maintenance-inventory-contract";

const prefix = process.env.MAINTENANCE_CONTRACT_DB ?? "TEST_DATABASE";
if (prefix !== "TEST_DATABASE" && prefix !== "E2E_DATABASE") {
  throw new Error("MAINTENANCE_CONTRACT_DB must be TEST_DATABASE or E2E_DATABASE.");
}

it(`${prefix} matches the approved maintenance and inventory contract without writing data`, async () => {
  const actual = await readIsolatedMaintenanceInventoryContract(prefix);
  for (const section of ["tables", "columns", "foreignKeys", "indexes", "checks", "objects"] as const) {
    expect(actual[section], `${prefix}: ${section} differs from the reviewed Development contract`).toEqual(expectedContract[section]);
  }
}, 45_000);
