import { ActionLink } from "@/components/ui/action-link/action-link";
import type { TripRequestDetails } from "../../application/trip-records";
import { TripCompletionButton } from "../execution/trip-completion-dialog";
import { formatTripDateTime } from "../trip-format";
import { TripRequestStatusControl } from "./trip-request-status-control";
import { RecordSidePanel, RecordProgress } from "../../../../components/ui/record-workspace/record-workspace";
import {
  workspaceTabHref,
  type TripWorkspaceView,
} from "./trip-workspace-view";

function leadFor(view: TripWorkspaceView): string {
  const action = view.nextAction;
  switch (view.status) {
    case "New":
      return action.enabled
        ? "تخصیص مسافران ذخیره شده است. گام بعدی، ثبت وضعیت تخصیص‌یافته است."
        : "درخواست ثبت شده است. برای ادامه، به هر مسافر راننده و خودرو بدهید.";
    case "Assigned":
      return action.enabled
        ? "راننده و خودرو ثبت شده‌اند. با شروع سفر، تغییر تخصیص دیگر ممکن نیست."
        : "برای شروع سفر، برنامهٔ معتبر همهٔ مسافران لازم است.";
    case "InProgress":
      return action.id === "record-return"
        ? "سفر در حال اجراست. مرحلهٔ بعد، ثبت پیاده‌شدن مسافران است."
        : "سفر در حال اجراست و پیاده‌شدن همهٔ مسافران ثبت شده است. می‌توانید سفر را تکمیل کنید.";
    case "Completed":
      return "این پرونده تکمیل شده و فقط برای مشاهده در دسترس است.";
    case "Cancelled":
      return "پرونده لغو شده و فقط برای مشاهدهٔ سوابق در دسترس است.";
    default:
      return "وضعیت این پرونده را در تب‌ها ببینید.";
  }
}

function historyEvents(details: TripRequestDetails) {
  const events: { label: string; at: Date }[] = [
    { label: "ثبت درخواست", at: details.requestDateTime },
  ];
  const planTimes = details.passengers.flatMap((passenger) =>
    passenger.executions
      .map((execution) => execution.createdAt)
      .filter((value): value is Date => value instanceof Date),
  );
  if (planTimes.length > 0) {
    events.push({
      label: "ثبت برنامه مسافر",
      at: new Date(Math.min(...planTimes.map((value) => value.getTime()))),
    });
  }
  const pickups = details.passengers.flatMap((passenger) =>
    passenger.executions
      .map((execution) => execution.actualPickupDateTime)
      .filter((value): value is Date => value instanceof Date),
  );
  if (pickups.length > 0) {
    events.push({
      label: "حرکت واقعی",
      at: new Date(Math.min(...pickups.map((value) => value.getTime()))),
    });
  }
  const dropoffs = details.passengers.flatMap((passenger) =>
    passenger.executions
      .map((execution) => execution.actualDropoffDateTime)
      .filter((value): value is Date => value instanceof Date),
  );
  if (dropoffs.length > 0) {
    events.push({
      label: "پیاده‌شدن مسافر",
      at: new Date(Math.max(...dropoffs.map((value) => value.getTime()))),
    });
  }
  return events.sort((left, right) => left.at.getTime() - right.at.getTime());
}

export function NextActionPanel({
  details,
  view,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
}) {
  const action = view.nextAction;
  const events = historyEvents(details);

  return (
    <RecordSidePanel title="اقدام بعدی" lead={leadFor(view)} hint={action.hint} warning={details.status === "Assigned" || details.status === "Cancelled"} action={<>
        {action.id === "plan-assignment" && (
          <ActionLink
            href={workspaceTabHref(details.tripRequestId, "assignment")}
            variant="primary"
          >
            {action.label}
          </ActionLink>
        )}
        {action.id === "record-return" && (
          <TripCompletionButton
            tripRequestId={details.tripRequestId}
            passengers={details.passengers}
            label={action.label}
            preferCompleted
          />
        )}
        {action.id !== "view-details" && action.id !== "record-return" && (
          <TripRequestStatusControl details={details} view={view} compact />
        )}
      </>}>
      <RecordProgress title="ردیابی وضعیت" items={events.map(event => ({
        id: event.label + event.at.toISOString(), label: event.label,
        detail: <time dateTime={event.at.toISOString()}>{formatTripDateTime(event.at)}</time>,
      }))} />
    </RecordSidePanel>
  );
}
