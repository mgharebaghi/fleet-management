import { describe, expect, it } from "vitest";

import expectedContract from "./maintenance-inventory-contract.json";
import { readIsolatedMaintenanceInventoryContract } from "./maintenance-inventory-contract";

describe.each(["TEST_DATABASE", "E2E_DATABASE"] as const)(
  "%s maintenance and inventory contract (read only)",
  prefix => {
    it("matches the approved SQL Server contract without provisioning or writing data", async () => {
      const actual = await readIsolatedMaintenanceInventoryContract(prefix);
      for (const section of ["tables", "columns", "foreignKeys", "indexes", "checks", "objects"] as const) {
        expect(actual[section], `${prefix}: ${section} differs from the reviewed Development contract`).toEqual(expectedContract[section]);
      }
    }, 45_000);
  },
);
