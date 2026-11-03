export type CompletionReading = { id: number; recordedAt: string; odometer: string | null; engineHours: string | null };
export type CompletionPlan = { id: number; vehicleId: number; typeId: number; needsOdometer: boolean; needsEngineHours: boolean; lastDate: string | null; lastOdometer: string | null; lastEngineHours: string | null };
export type WorkOrderCompletionContext = { now: string; plan: CompletionPlan | null; readings: CompletionReading[] };
export type CompleteWorkOrderInput = { id: number; result: string; readingId: number | null };
export type WorkOrderCompletionFailure = "INVALID_ID" | "RESULT_REQUIRED" | "RESULT_TOO_LONG" | "INVALID_READING" | "NOT_FOUND" | "ORDER_CLOSED" | "ORDER_NOT_STARTED" | "UNKNOWN_STATE" | "NO_COMPLETED_TASK" | "UNFINISHED_TASKS" | "INVALID_END_TIME" | "PLAN_READING_REQUIRED" | "PLAN_BASELINE_NEWER";
export type WorkOrderCompletionResult = { success: true; id: number } | { success: false; error: WorkOrderCompletionFailure };
export type WorkOrderCompletionWrite = { result: string; endedAt: string; planBaseline: { id: number; odometer: string | null; engineHours: string | null } | null };
