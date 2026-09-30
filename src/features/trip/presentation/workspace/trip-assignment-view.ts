import type { TripExecutionRecord, TripPassengerRecord } from "../../application/trip-records";

export type DistinctAssignmentItem = {
  assignmentId: number;
  execution: TripExecutionRecord;
  passengerNames: string[];
};

export function distinctAssignmentExecutions(
  passengers: TripPassengerRecord[],
): DistinctAssignmentItem[] {
  const map = new Map<number, DistinctAssignmentItem>();

  for (const trip of passengers) {
    const passengerName =
      `${trip.passenger.firstName} ${trip.passenger.lastName}`.trim();
    for (const execution of trip.executions) {
      const assignmentId = execution.assignment?.assignmentId;
      if (assignmentId == null) continue;

      const existing = map.get(assignmentId);
      if (existing) {
        if (passengerName && !existing.passengerNames.includes(passengerName)) {
          existing.passengerNames.push(passengerName);
        }
      } else {
        map.set(assignmentId, {
          assignmentId,
          execution,
          passengerNames: passengerName ? [passengerName] : [],
        });
      }
    }
  }

  return Array.from(map.values());
}
