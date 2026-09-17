import { describe, expect, it, vi } from "vitest";

import { ReadTrips } from "./read-trips";
import type { TripRepository } from "./trip-repository";

const repository = {
  atomic: vi.fn(),
  list: vi.fn(),
  details: vi.fn(),
  requestTypes: vi.fn(),
  availablePeople: vi.fn(),
  availableLocations: vi.fn(),
  assignmentsActiveAt: vi.fn(),
} as unknown as TripRepository;

describe("ReadTrips", () => {
  it("normalizes list filters and unsafe page numbers", async () => {
    vi.mocked(repository.list).mockResolvedValue({
      requests: [],
      totalCount: 0,
      statuses: [],
    });
    const reader = new ReadTrips(repository);

    await reader.list("  request  ", "  status  ", -1);

    expect(repository.list).toHaveBeenCalledWith("request", "status", 1);
  });

  it("does not query persistence for invalid identities or dates", async () => {
    const reader = new ReadTrips(repository);

    await expect(reader.details(0)).resolves.toBeNull();
    await expect(
      reader.assignmentsActiveAt(new Date("invalid")),
    ).resolves.toEqual([]);
    expect(repository.details).not.toHaveBeenCalled();
    expect(repository.assignmentsActiveAt).not.toHaveBeenCalled();
  });
});
