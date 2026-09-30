import { describe, expect, it, vi } from "vitest";

import type { DriverRepository } from "./driver-repository";
import { ReadDrivers } from "./read-drivers";

function repository() {
  return {
    atomic: vi.fn(),
    list: vi.fn().mockResolvedValue({ drivers: [], totalCount: 0 }),
    details: vi.fn(),
    availablePeople: vi.fn(),
    availableVehicles: vi.fn(),
    currentVehicleAssignments: vi.fn(),
  } satisfies DriverRepository;
}

describe("driver search normalization", () => {
  it("normalizes equivalent Persian/Arabic letters and numerals before querying", async () => {
    const port = repository();
    const reader = new ReadDrivers(port);
    await reader.list("  علي كاظمي ۱۲٣  ", 2);
    expect(port.list).toHaveBeenCalledWith("علی کاظمی 123", 2);
  });

  it("retains the established page bounds and rejects invalid detail IDs", async () => {
    const port = repository();
    const reader = new ReadDrivers(port);
    await reader.list("driver", 1_000_001);
    expect(port.list).toHaveBeenCalledWith("driver", 1);
    expect(await reader.details(-1)).toBeNull();
    expect(port.details).not.toHaveBeenCalled();
  });
});
