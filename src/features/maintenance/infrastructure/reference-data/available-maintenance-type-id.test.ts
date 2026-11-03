import { expect, it } from "vitest";
import { availableMaintenanceTypeId } from "./available-maintenance-type-id";
it("allocates positive tinyint identifiers, reuses gaps and reports exhaustion", () => {
  expect(availableMaintenanceTypeId(new Set())).toBe(1);
  expect(availableMaintenanceTypeId(new Set([0, 1, 3]))).toBe(2);
  const used = new Set(Array.from({ length: 254 }, (_, index) => index + 1));
  expect(availableMaintenanceTypeId(used)).toBe(255);
  used.add(255); expect(availableMaintenanceTypeId(used)).toBeNull();
});
