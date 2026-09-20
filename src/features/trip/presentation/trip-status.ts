import type {
  TripExecutionStatus,
  TripRequestStatus,
} from "../application/trip-lifecycle";

export const requestStatusLabels: Record<TripRequestStatus, string> = {
  New: "جدید",
  Assigned: "تخصیص‌یافته",
  InProgress: "در حال اجرا",
  Completed: "تکمیل‌شده",
  Cancelled: "لغوشده",
};

export const executionStatusLabels: Record<TripExecutionStatus, string> = {
  Planned: "برنامه‌ریزی‌شده",
  InProgress: "در حال اجرا",
  Completed: "تکمیل‌شده",
  Cancelled: "لغوشده",
};

export function requestStatusLabel(status: string): string {
  return status in requestStatusLabels
    ? requestStatusLabels[status as TripRequestStatus]
    : status;
}

export function executionStatusLabel(status: string): string {
  return status in executionStatusLabels
    ? executionStatusLabels[status as TripExecutionStatus]
    : status;
}

export function requestStatusTargets(
  status: string,
): TripRequestStatus[] {
  switch (status) {
    case "New":
      return ["Assigned", "Cancelled"];
    case "Assigned":
      return ["InProgress", "Cancelled"];
    case "InProgress":
      return ["Completed"];
    default:
      return [];
  }
}

export function executionStatusTargets(
  status: string,
): TripExecutionStatus[] {
  switch (status) {
    case "Planned":
      return ["InProgress", "Cancelled"];
    case "InProgress":
      return ["Completed"];
    default:
      return [];
  }
}
