import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { taskFailureMessages, type WorkTaskFormState } from "./work-task-presentation";
export function WorkTaskFeedback({ state }: { state: WorkTaskFormState }) {
  return <>{state.error && <InlineNotice role="alert" tone="danger">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : taskFailureMessages[state.error.type]}</InlineNotice>}{state.unavailable && <InlineNotice role="alert" tone="danger">ثبت تغییرات امکان‌پذیر نبود. پیش از تلاش دوباره، وضعیت کار را بررسی کنید.</InlineNotice>}</>;
}
