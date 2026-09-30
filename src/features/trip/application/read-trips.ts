import type { TripRepository } from "./trip-repository";
import { normalizeTripSearchText } from "./trip-search";
import { isValidTripDate, isValidTripId } from "./trip-validation";
import type { TripAssignmentReference, TripPassengerRecord } from "./trip-records";

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

  async assignmentsByPassenger(passengers: readonly Pick<TripPassengerRecord, "tripId" | "requestedPickupDateTime">[], requestedTravelDateTime: Date): Promise<Record<number, TripAssignmentReference[]>> {
    const readsByInstant = new Map<number, Promise<TripAssignmentReference[]>>();
    const entries = await Promise.all(passengers.map(async passenger => {
      const pickup = passenger.requestedPickupDateTime ?? requestedTravelDateTime;
      const instant = pickup.getTime();
      let read = readsByInstant.get(instant);
      if (!read) {
        read = this.assignmentsActiveAt(pickup);
        readsByInstant.set(instant, read);
      }
      return [passenger.tripId, await read] as const;
    }));
    return Object.fromEntries(entries);
  }

  activePassengerCountsByVehicle(vehicleIds: readonly number[]) {
    const ids = vehicleIds.filter((id) => isValidTripId(id));
    return ids.length === 0
      ? Promise.resolve({})
      : this.repository.activePassengerCountsByVehicle(ids);
  }

  countPendingRequests() {
    return this.repository.countPendingRequests();
  }
}
