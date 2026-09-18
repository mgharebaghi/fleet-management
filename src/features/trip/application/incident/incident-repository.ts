import type {
  RecordAccidentCommand,
  RecordViolationCommand,
} from "./incident-records";

export type IncidentRequestOwnership = {
  status: string;
  assignmentIds: number[];
};

export interface IncidentWriteSession {
  requestOwnership(
    tripRequestId: number,
  ): Promise<IncidentRequestOwnership | null>;
  createAccident(input: RecordAccidentCommand): Promise<number>;
  createViolation(input: RecordViolationCommand): Promise<number>;
}

export interface IncidentRepository {
  atomic<T>(work: (session: IncidentWriteSession) => Promise<T>): Promise<T>;
}
