import {
  everyPassengerExecutionCompleted,
  everyPassengerHasPersistedPlan,
  requestHasStartedExecution,
} from "../../application/trip-lifecycle";
import type {
  TripPassengerRecord,
  TripRequestDetails,
  TripRequestSummary,
} from "../../application/trip-records";
import { persistedPlanningExecution } from "../trip-execution-current";
import { locationSummary } from "../trip-format";
import { requestStatusLabel } from "../trip-status";

export const WORKFLOW_STAGE_IDS = [
  "request",
  "planning",
  "ready",
  "running",
  "return",
] as const;

export type WorkflowStageId = (typeof WORKFLOW_STAGE_IDS)[number];

export type WorkflowStageState =
  | "complete"
  | "current"
  | "upcoming"
  | "cancelled";

export const WORKFLOW_STAGE_LABELS: Record<WorkflowStageId, string> = {
  request: "ثبت درخواست",
  planning: "برنامه‌ریزی",
  ready: "آماده اعزام",
  running: "اجرای سفر",
  return: "بازگشت و تکمیل",
};

export type WorkspaceSectionId =
  | "details"
  | "planning"
  | "execution"
  | "return";

export type TripNextActionId =
  | "plan-assignment"
  | "mark-assigned"
  | "record-departure"
  | "mark-in-progress"
  | "record-return"
  | "complete-request"
  | "view-details";

export type TripNextAction = {
  id: TripNextActionId;
  label: string;
  sectionId: WorkspaceSectionId;
  enabled: boolean;
  hint: string | null;
};

export type PlanningReadiness = "missing-optional" | "recorded";
export type AssignmentReadiness = "needed" | "recorded";
export type VoucherReadiness = "after-assignment" | "ready";

export type PassengerWorkspaceItem = {
  tripId: number;
  personName: string;
  personnelNo: string | null;
  mobile: string | null;
  originName: string;
  destinationName: string;
  pickupAt: Date;
  pickupOrder: number | null;
  dropoffOrder: number | null;
  passengerStatus: string | null;
  description: string | null;
  hasPlan: boolean;
  hasRoute: boolean;
  executionStatus: string | null;
  canSurvey: boolean;
  canRecordIncident: boolean;
};

export type WorkflowStageView = {
  id: WorkflowStageId;
  label: string;
  state: WorkflowStageState;
};

export type TripWorkspaceView = {
  tripRequestId: number;
  requestNo: string;
  status: string;
  statusLabel: string;
  requestTypeName: string;
  requestAt: Date;
  plannedAt: Date;
  purpose: string | null;
  description: string | null;
  passengerCount: number;
  originSummary: string;
  destinationSummary: string;
  stages: WorkflowStageView[];
  currentStageId: WorkflowStageId | null;
  nextAction: TripNextAction;
  canCancel: boolean;
  routeReadiness: PlanningReadiness;
  assignmentReadiness: AssignmentReadiness;
  voucherReadiness: VoucherReadiness;
  passengers: PassengerWorkspaceItem[];
};

export type TripListItemView = {
  tripRequestId: number;
  requestNo: string;
  statusLabel: string;
  requestTypeName: string;
  plannedAt: Date;
  passengerCount: number;
  originSummary: string;
  destinationSummary: string;
  purpose: string | null;
  currentStageLabel: string;
  nextActionHint: string;
};

const LEGACY_TAB_SECTIONS: Record<string, WorkspaceSectionId> = {
  general: "details",
  passengers: "details",
  assignment: "planning",
  route: "planning",
  execution: "execution",
  survey: "return",
};

function lifecycleSnapshot(details: TripRequestDetails) {
  return {
    status: details.status,
    passengers: details.passengers.map((trip) => ({
      tripId: trip.tripId,
      executions: trip.executions.map((execution) => ({
        tripExecutionId: execution.tripExecutionId,
        status: execution.status,
        actualPickupDateTime: execution.actualPickupDateTime,
      })),
    })),
  };
}

function passengerHasPlan(passenger: TripPassengerRecord) {
  return persistedPlanningExecution(passenger.executions) !== null;
}

function passengerHasRoute(passenger: TripPassengerRecord) {
  return (
    passenger.routes.length > 0 ||
    passenger.executions.some((execution) => execution.routes.length > 0)
  );
}

function currentStageId(
  status: string,
  hasPlan: boolean,
): WorkflowStageId | null {
  if (status === "Cancelled") return null;
  if (status === "Completed") return "return";
  if (status === "InProgress") return "running";
  if (status === "Assigned") return "ready";
  if (hasPlan) return "ready";
  return "planning";
}

function stageState(
  stageId: WorkflowStageId,
  current: WorkflowStageId | null,
  cancelled: boolean,
): WorkflowStageState {
  if (cancelled) return "cancelled";
  if (!current) return "upcoming";
  const currentIndex = WORKFLOW_STAGE_IDS.indexOf(current);
  const index = WORKFLOW_STAGE_IDS.indexOf(stageId);
  if (index < currentIndex) return "complete";
  if (index === currentIndex) {
    return current === "return" ? "complete" : "current";
  }
  return "upcoming";
}

function nextActionFor(details: TripRequestDetails): TripNextAction {
  const snapshot = lifecycleSnapshot(details);
  const hasPlan = everyPassengerHasPersistedPlan(snapshot);
  const started = requestHasStartedExecution(snapshot);
  const executionsComplete = everyPassengerExecutionCompleted(snapshot);

  if (details.status === "Cancelled" || details.status === "Completed") {
    return {
      id: "view-details",
      label: "مشاهده جزئیات سفر",
      sectionId: "details",
      enabled: true,
      hint: null,
    };
  }

  if (details.status === "New" && !hasPlan) {
    return {
      id: "plan-assignment",
      label: "ثبت خودرو و راننده",
      sectionId: "planning",
      enabled: true,
      hint: "برای هر مسافر یک تخصیص واجد شرایط ذخیره کنید.",
    };
  }

  if (details.status === "New" && hasPlan) {
    return {
      id: "mark-assigned",
      label: "ثبت تخصیص‌یافته",
      sectionId: "planning",
      enabled: true,
      hint: null,
    };
  }

  if (details.status === "Assigned" && !started) {
    return {
      id: "record-departure",
      label: "ثبت زمان حرکت",
      sectionId: "execution",
      enabled: true,
      hint: "زمان واقعی حرکت را از برگهٔ کاغذی وارد کنید.",
    };
  }

  if (details.status === "Assigned" && started) {
    return {
      id: "mark-in-progress",
      label: "شروع درخواست",
      sectionId: "execution",
      enabled: true,
      hint: null,
    };
  }

  if (details.status === "InProgress" && !executionsComplete) {
    return {
      id: "record-return",
      label: "ثبت بازگشت",
      sectionId: "execution",
      enabled: true,
      hint: "زمان و کیلومتر واقعی بازگشت را ثبت کنید.",
    };
  }

  return {
    id: "complete-request",
    label: "تکمیل درخواست",
    sectionId: "return",
    enabled: executionsComplete,
    hint: executionsComplete
      ? null
      : "اجرای همهٔ مسافران باید تکمیل شده باشد.",
  };
}

function listStageLabel(status: string) {
  if (status === "Cancelled") return "لغوشده";
  if (status === "Completed") return WORKFLOW_STAGE_LABELS.return;
  if (status === "InProgress") return WORKFLOW_STAGE_LABELS.running;
  if (status === "Assigned") return WORKFLOW_STAGE_LABELS.ready;
  return WORKFLOW_STAGE_LABELS.planning;
}

function listNextActionHint(status: string) {
  switch (status) {
    case "New":
      return "ثبت خودرو و راننده";
    case "Assigned":
      return "ثبت زمان حرکت";
    case "InProgress":
      return "ثبت بازگشت";
    default:
      return "مشاهده جزئیات سفر";
  }
}

export function workspaceSectionForTab(
  tab: string | undefined,
): WorkspaceSectionId {
  if (!tab) return "details";
  return LEGACY_TAB_SECTIONS[tab] ?? "details";
}

export function projectTripWorkspace(
  details: TripRequestDetails,
): TripWorkspaceView {
  const snapshot = lifecycleSnapshot(details);
  const hasPlan = everyPassengerHasPersistedPlan(snapshot);
  const started = requestHasStartedExecution(snapshot);
  const cancelled = details.status === "Cancelled";
  const current = currentStageId(details.status, hasPlan);
  const origins = details.passengers.map(
    (passenger) => passenger.origin.locationName,
  );
  const destinations = details.passengers.map(
    (passenger) => passenger.destination.locationName,
  );
  const hasAnyRoute = details.passengers.some(passengerHasRoute);

  return {
    tripRequestId: details.tripRequestId,
    requestNo: details.requestNo,
    status: details.status,
    statusLabel: requestStatusLabel(details.status),
    requestTypeName: details.requestType.typeName,
    requestAt: details.requestDateTime,
    plannedAt: details.requestedTravelDateTime,
    purpose: details.purpose,
    description: details.description,
    passengerCount: details.passengers.length,
    originSummary: locationSummary([...new Set(origins)], "چند مبدأ"),
    destinationSummary: locationSummary(
      [...new Set(destinations)],
      "چند مقصد",
    ),
    stages: WORKFLOW_STAGE_IDS.map((id) => ({
      id,
      label: WORKFLOW_STAGE_LABELS[id],
      state: stageState(id, current, cancelled),
    })),
    currentStageId: current,
    nextAction: nextActionFor(details),
    canCancel:
      (details.status === "New" || details.status === "Assigned") && !started,
    routeReadiness: hasAnyRoute ? "recorded" : "missing-optional",
    assignmentReadiness: hasPlan ? "recorded" : "needed",
    voucherReadiness: hasPlan ? "ready" : "after-assignment",
    passengers: details.passengers.map((passenger) => {
      const plan = persistedPlanningExecution(passenger.executions);
      const completed = passenger.executions.find(
        (execution) => execution.status === "Completed",
      );
      return {
        tripId: passenger.tripId,
        personName:
          `${passenger.passenger.firstName} ${passenger.passenger.lastName}`.trim(),
        personnelNo: passenger.passenger.personnelNo,
        mobile: passenger.passenger.mobile,
        originName: passenger.origin.locationName,
        destinationName: passenger.destination.locationName,
        pickupAt:
          passenger.requestedPickupDateTime ?? details.requestedTravelDateTime,
        pickupOrder: passenger.pickupOrder,
        dropoffOrder: passenger.dropoffOrder,
        passengerStatus: passenger.status,
        description: passenger.description,
        hasPlan: passengerHasPlan(passenger),
        hasRoute: passengerHasRoute(passenger),
        executionStatus: plan?.status ?? completed?.status ?? null,
        canSurvey:
          Boolean(completed) && details.status !== "Cancelled",
        canRecordIncident: Boolean(completed),
      };
    }),
  };
}

export function projectTripListItem(
  request: TripRequestSummary,
): TripListItemView {
  return {
    tripRequestId: request.tripRequestId,
    requestNo: request.requestNo,
    statusLabel: requestStatusLabel(request.status),
    requestTypeName: request.requestTypeName,
    plannedAt: request.requestedTravelDateTime,
    passengerCount: request.passengerCount,
    originSummary: locationSummary(request.origins, "چند مبدأ"),
    destinationSummary: locationSummary(request.destinations, "چند مقصد"),
    purpose: request.purpose,
    currentStageLabel: listStageLabel(request.status),
    nextActionHint: listNextActionHint(request.status),
  };
}
