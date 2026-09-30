import { cache } from "react";
import { makeReadTrips } from "./trip.factory";

export const readPendingTripRequestCount = cache(async () => makeReadTrips().countPendingRequests());
