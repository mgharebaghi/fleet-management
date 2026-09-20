import { executionStatusLabel } from "../trip-status";
import type { PassengerWorkspaceItem } from "./trip-workspace-view";

/** Nullable Trip.Status — no invented lifecycle semantics. */
export function presentTripPassengerStatus(status: string | null): string {
  if (status == null || status.trim() === "") {
    return "ثبت نشده";
  }
  return status;
}

/** Planning / execution readiness — separate from Trip.Status. */
export function presentPlanningExecutionStatusLabel(
  item: Pick<PassengerWorkspaceItem, "executionStatus" | "hasPlan">,
): string {
  if (item.executionStatus) {
    return executionStatusLabel(item.executionStatus);
  }
  if (item.hasPlan) {
    return "برنامه ثبت شده";
  }
  return "نیازمند برنامه‌ریزی";
}

export const completionSurveyIntroText =
  "نظرسنجی مسافران را می‌توانید برای اجراهای تکمیل‌شده ثبت کنید.";

export function completionSurveyProgressLine(
  surveyedCount: number,
  passengerCount: number,
): string {
  return `${surveyedCount} از ${passengerCount} مسافر — ${completionSurveyIntroText}`;
}

/** Survey must not be described as required for Request completion. */
export function assertsSurveyNotRequiredForRequestCompletion(copy: string): boolean {
  const forbidden = [
    "برای تکمیل نهایی",
    "نظرسنجی مسافران را ثبت کنید",
    "همه نظرسنجی",
    "اجباری",
  ];
  return !forbidden.some((phrase) => copy.includes(phrase));
}

export function hasExecutionDescription(
  description: string | null | undefined,
): boolean {
  return description != null && description.trim() !== "";
}
