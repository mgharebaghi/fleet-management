import type { TripRepository } from "./trip-repository";
import { normalizeTripSearchText } from "./trip-search";
import { isValidTripDate, isValidTripId } from "./trip-validation";

export class ReadTrips {
  constructor(private readonly repository: TripRepository) {}

  list(search = "", status = "", page = 1) {
    const normalizedPage =
      Number.isSafeInteger(page) && page > 0 && page <= 1_000_000
        ? page
        : 1;
    return this.repository.list(
      normalizeTripSearchText(search),
      status.trim(),
      normalizedPage,
    );
  }

  details(id: number) {
    return isValidTripId(id)
      ? this.repository.details(id)
      : Promise.resolve(null);
  }

  requestTypes() {
    return this.repository.requestTypes();
  }

  availablePeople() {
    return this.repository.availablePeople();
  }

  availableLocations() {
    return this.repository.availableLocations();
  }

  assignmentsActiveAt(dateTime: Date) {
    return isValidTripDate(dateTime)
      ? this.repository.assignmentsActiveAt(dateTime)
      : Promise.resolve([]);
  }
}
