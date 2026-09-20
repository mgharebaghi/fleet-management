import type { TripExecutionRecord } from "../application/trip-records";
import { isNonTerminalTripExecutionStatus } from "../application/trip-lifecycle";

export function currentNonTerminalExecution(
  executions: readonly TripExecutionRecord[],
): TripExecutionRecord | null {
  return (
    executions.find((execution) =>
      isNonTerminalTripExecutionStatus(execution.status),
    ) ?? null
  );
}

export function persistedPlanningExecution(
  executions: readonly TripExecutionRecord[],
): TripExecutionRecord | null {
  return (
    currentNonTerminalExecution(executions) ??
    executions.find((execution) => execution.status !== "Cancelled") ??
    null
  );
}
