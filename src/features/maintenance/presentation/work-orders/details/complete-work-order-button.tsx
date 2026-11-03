"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FieldErrors, FieldHint, FieldLabel, FormActions, FormField, formControlClassName } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { SearchableSelect } from "@/components/ui/searchable-select/searchable-select";
import { formatDecimalAmount } from "@/components/ui/decimal-input/decimal-format";
import { formatDuration } from "@/components/ui/duration-input/duration-value";
import { useEditableActionState } from "@/shared/presentation/use-editable-action-state";
import type { CompletionReading } from "../../../application/work-orders/work-order-completion-records";
import { requestDateFormatter } from "../../requests/shared/request-presentation";
import { completeWorkOrderAction, type CompleteWorkOrderState } from "./complete-work-order.action";
const messages = {
  INVALID_ID: "شناسهٔ پرونده معتبر نیست.", RESULT_REQUIRED: "نتیجهٔ نهایی تعمیر را وارد کنید.", RESULT_TOO_LONG: "نتیجهٔ نهایی حداکثر ۱۰۰۰ نویسه باشد.",
  INVALID_READING: "سابقهٔ کارکرد انتخاب‌شده معتبر نیست؛ تاریخ و روند کارکرد خودرو را بررسی کنید.", NOT_FOUND: "پرونده پیدا نشد.", ORDER_CLOSED: "پرونده قبلاً بسته شده است.",
  ORDER_NOT_STARTED: "ابتدا تعمیر را شروع کنید.", UNKNOWN_STATE: "اطلاعات پرونده، کارها یا برنامهٔ سرویس نامشخص است؛ سوابق را بررسی کنید.",
  NO_COMPLETED_TASK: "برای پایان تعمیر، حداقل یک کار باید انجام‌شده باشد.", UNFINISHED_TASKS: "ابتدا کارهای باقی‌مانده را انجام‌شده یا لغوشده مشخص کنید.",
  INVALID_END_TIME: "زمان پایان نمی‌تواند پیش از شروع باشد؛ زمان شروع و ساعت سامانه را بررسی کنید.",
  PLAN_READING_REQUIRED: "برای پایان سرویس، سابقه‌ای با کیلومتر یا ساعت موردنیاز برنامه انتخاب کنید.",
  PLAN_BASELINE_NEWER: "مبنای سرویس جدیدتر از اطلاعات انتخابی است؛ سابقهٔ مناسب را انتخاب کنید.", UNAVAILABLE: "پایان تعمیر ثبت نشد؛ دوباره تلاش کنید.",
};
export function CompleteWorkOrderButton({ id, number, service, readings }: { id: number; number: string; service: boolean; readings: CompletionReading[] }) {
  const [open, setOpen] = useState(false);
  return <><ActionButton onClick={() => setOpen(true)}>ثبت پایان تعمیر</ActionButton>{open && <CompletionDialog id={id} number={number} service={service} readings={readings} onClose={() => setOpen(false)} />}</>;
}
function CompletionDialog({ id, number, service, readings, onClose }: { id: number; number: string; service: boolean; readings: CompletionReading[]; onClose: () => void }) {
  const [result, setResult] = useState("");
  const [state, action, pending, onInput, submitted] = useEditableActionState(completeWorkOrderAction.bind(null, id), {} as CompleteWorkOrderState, { RESULT_REQUIRED: ["result"], RESULT_TOO_LONG: ["result"], INVALID_READING: ["readingId"], PLAN_READING_REQUIRED: ["readingId"], PLAN_BASELINE_NEWER: ["readingId"] });
  useEffect(() => { if (submitted.saved && !pending) onClose(); }, [submitted, pending, onClose]);
  const resultError = state.error === "RESULT_REQUIRED" || state.error === "RESULT_TOO_LONG";
  const readingError = state.error === "INVALID_READING" || state.error === "PLAN_READING_REQUIRED" || state.error === "PLAN_BASELINE_NEWER";
  return <ConfirmDialog open tone="primary" onClose={() => { if (!pending) onClose(); }} titleId="complete-repair-order" title="ثبت پایان تعمیر" recordName={number} message="پس از ثبت پایان، پرونده بازگشایی نمی‌شود؛ فقط مبلغ‌های نامشخص قابل تکمیل هستند.">
    <form action={action} onInputCapture={onInput} noValidate aria-busy={pending}>
      {!service && <input type="hidden" name="readingId" value="" />}
      <FormField><FieldLabel htmlFor="repair-final-result" required>نتیجهٔ نهایی تعمیر</FieldLabel><textarea id="repair-final-result" name="result" rows={4} className={formControlClassName} value={result} onChange={event => setResult(event.target.value)} disabled={pending} aria-invalid={resultError} aria-describedby="repair-final-error" /><FieldErrors id="repair-final-error" messages={resultError ? [messages[state.error!]] : []} /></FormField>
      {service && <FormField><SearchableSelect name="readingId" label="کارکرد مبنای سرویس" disabled={pending} defaultValue="" invalid={readingError} describedBy="completion-reading-error" options={[{ value: "", label: "انتخاب سابقهٔ کارکرد", content: "انتخاب سابقهٔ کارکرد", searchText: "" }, ...readings.map(reading => {
        const label = [requestDateFormatter.format(new Date(reading.recordedAt)), reading.odometer !== null ? `${formatDecimalAmount(reading.odometer)} کیلومتر` : "", reading.engineHours !== null ? formatDuration(reading.engineHours) : ""].filter(Boolean).join(" — ");
        return { value: String(reading.id), label, content: label, searchText: label };
      })]} /><FieldErrors id="completion-reading-error" messages={readingError ? [messages[state.error!]] : []} />{!readings.length && <FieldHint>سابقهٔ کارکردی برای این خودرو ثبت نشده است؛ سرویس‌های دارای معیار کارکرد به سابقهٔ معتبر نیاز دارند.</FieldHint>}</FormField>}
      <FieldHint>زمان پایان هنگام تأیید، به وقت تهران ثبت می‌شود.</FieldHint>
      {state.error && !resultError && !readingError && <InlineNotice tone="danger" role="alert">{messages[state.error]}</InlineNotice>}
      <FormActions separated><ActionButton type="submit" pending={pending}>تأیید پایان تعمیر</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions>
    </form>
  </ConfirmDialog>;
}
