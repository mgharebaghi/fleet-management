"use client";
import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions, FormField } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { startWorkOrderAction, type StartWorkOrderState } from "./start-work-order.action";
const messages = {
  INVALID_ID: "شناسهٔ پرونده معتبر نیست.", NOT_FOUND: "پرونده پیدا نشد.", ORDER_CLOSED: "پرونده بسته است و قابل شروع نیست.",
  ALREADY_STARTED: "تعمیر این پرونده قبلاً شروع شده است؛ صفحه را به‌روزرسانی کنید.",
  UNKNOWN_STATE: "اطلاعات پرونده یا وضعیت سفر و تعمیرات خودرو نامشخص است؛ ابتدا سوابق را بررسی کنید.",
  VEHICLE_INACTIVE: "خودرو غیرفعال است و تعمیر آن شروع نمی‌شود.", ANOTHER_REPAIR: "این خودرو یک پروندهٔ تعمیر در حال انجام دارد.",
  ACTIVE_TRIP: "خودرو در سفر جاری است؛ پس از پایان سفر، تعمیر را شروع کنید.", UNAVAILABLE: "شروع تعمیر ثبت نشد؛ دوباره تلاش کنید.",
};
export function StartWorkOrderButton({ id, number }: { id: number; number: string }) {
  const [open, setOpen] = useState(false);
  return <><ActionButton onClick={() => setOpen(true)}>شروع تعمیر</ActionButton>{open && <StartDialog id={id} number={number} onClose={() => setOpen(false)} />}</>;
}
function StartDialog({ id, number, onClose }: { id: number; number: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(startWorkOrderAction.bind(null, id), {} as StartWorkOrderState);
  const [acknowledge, setAcknowledge] = useState(false);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open tone="primary" onClose={() => { if (!pending) onClose(); }} titleId="start-repair-order" title="شروع تعمیر" recordName={number} message="با تأیید، زمان شروع ثبت می‌شود و خودرو تا پایان تعمیر برای تخصیص و سفر در دسترس نخواهد بود.">
    <form action={action} aria-busy={pending}>
      {state.error === "PLANNED_TRIPS_REQUIRE_CONFIRMATION" ? <>
        <InlineNotice tone="info" role="alert">این خودرو {new Intl.NumberFormat("fa-IR").format(state.plannedTrips ?? 0)} سفر برنامه‌ریزی‌شده دارد؛ شروع تعمیر، اعزام آن را مسدود می‌کند.</InlineNotice>
        <FormField><label><input type="checkbox" name="acknowledgePlannedTrips" checked={acknowledge} onChange={event => setAcknowledge(event.target.checked)} disabled={pending} /> با وجود سفرهای برنامه‌ریزی‌شده، تعمیر شروع شود</label></FormField>
      </> : state.error && <InlineNotice tone="danger" role="alert">{messages[state.error]}</InlineNotice>}
      <FormActions separated><ActionButton type="submit" pending={pending}>تأیید شروع تعمیر</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions>
    </form>
  </ConfirmDialog>;
}
