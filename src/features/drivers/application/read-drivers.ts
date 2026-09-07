import type { DriverRepository } from "./driver-repository";
import { validId } from "./assignment-rules";

export class ReadDrivers {
  constructor(private readonly repository: DriverRepository) {}
  list(search = "", page = 1) {
    return this.repository.list(search.trim(), Number.isSafeInteger(page) && page > 0 && page <= 1000000 ? page : 1);
  }
  details(id: number) { return validId(id) ? this.repository.details(id) : Promise.resolve(null); }
  availablePeople() { return this.repository.availablePeople(); }
  availableVehicles() { return this.repository.availableVehicles(); }
}
