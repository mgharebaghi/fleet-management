import type { TripExecutionRecord } from "../../application/trip-records";
import { parseTehranDateTime, tehranDateTimeInputs } from "../trip-form-data";

export type PassengerExecutionDraft = {
  actualPickupDay: string;
  actualPickupTime: string;
  actualDropoffDay: string;
  actualDropoffTime: string;
  startOdometer: string;
  endOdometer: string;
  executionStatus: string;
  executionDescription: string;
};

export function initialExecutionDraft(
  execution: TripExecutionRecord,
  preferCompleted: boolean,
): PassengerExecutionDraft {
  const pickup = tehranDateTimeInputs(execution.actualPickupDateTime);
  const dropoff = tehranDateTimeInputs(execution.actualDropoffDateTime);
  const storedStatus = execution.status === "Completed" ? "Completed" : "InProgress";

  return {
    actualPickupDay: pickup.day,
    actualPickupTime: pickup.time,
    actualDropoffDay: dropoff.day,
    actualDropoffTime: dropoff.time,
    startOdometer: execution.startOdometer ?? "",
    endOdometer: execution.endOdometer ?? "",
    executionStatus:
      preferCompleted && execution.status !== "Completed"
        ? "Completed"
        : storedStatus,
    executionDescription: execution.description ?? "",
  };
}

export function readExecutionDraft(form: HTMLFormElement): PassengerExecutionDraft {
  const data = new FormData(form);
  const value = (name: keyof PassengerExecutionDraft) => String(data.get(name) ?? "");

  return {
    actualPickupDay: value("actualPickupDay"),
    actualPickupTime: value("actualPickupTime"),
    actualDropoffDay: value("actualDropoffDay"),
    actualDropoffTime: value("actualDropoffTime"),
    startOdometer: value("startOdometer"),
    endOdometer: value("endOdometer"),
    executionStatus: value("executionStatus"),
    executionDescription: value("executionDescription"),
  };
}

export function sameExecutionDraft(
  left: PassengerExecutionDraft,
  right: PassengerExecutionDraft,
): boolean {
  return (Object.keys(left) as (keyof PassengerExecutionDraft)[]).every(
    (key) => left[key] === right[key],
  );
}

/** True when both instants are complete and drop-off is strictly before pickup. */
export function dropoffBeforePickup(draft: PassengerExecutionDraft): boolean {
  const pickup = parseTehranDateTime(draft.actualPickupDay, draft.actualPickupTime);
  const dropoff = parseTehranDateTime(draft.actualDropoffDay, draft.actualDropoffTime);
  if (
    !pickup ||
    !dropoff ||
    Number.isNaN(pickup.getTime()) ||
    Number.isNaN(dropoff.getTime())
  ) {
    return false;
  }

  return dropoff.getTime() < pickup.getTime();
}
