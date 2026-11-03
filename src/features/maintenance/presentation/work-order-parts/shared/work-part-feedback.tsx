import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { workPartMessages, type WorkPartFormState } from "./work-part-presentation";
export function WorkPartFeedback({ state }: { state: WorkPartFormState }) {
  return <>{state.error && <InlineNotice role="alert" tone="danger">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : workPartMessages[state.error.type]}</InlineNotice>}{state.unavailable && <InlineNotice role="alert" tone="danger">ثبت اطلاعات انجام نشد؛ دوباره تلاش کنید.</InlineNotice>}</>;
}
