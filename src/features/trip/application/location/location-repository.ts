import type { TripLocationReference } from "../trip-records";
import type {
  CreateLocationCommand,
  LocationDuplicateCandidate,
} from "./location-records";

export interface LocationWriteSession {
  duplicateCandidates(): Promise<LocationDuplicateCandidate[]>;
  create(input: CreateLocationCommand): Promise<TripLocationReference>;
}

export interface LocationRepository {
  atomic<T>(work: (session: LocationWriteSession) => Promise<T>): Promise<T>;
}
