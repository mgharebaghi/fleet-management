import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { requestFailureMessages, type RequestFormState } from "./request-form-state";
export function RequestFormFeedback({ state }: { state: RequestFormState }) {
  return <>{state.error && <InlineNotice tone="danger" role="alert">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : requestFailureMessages[state.error.type]}</InlineNotice>}{state.unavailable && <InlineNotice tone="danger" role="alert">ثبت تغییرات امکان‌پذیر نبود. پیش از تلاش مجدد، وضعیت درخواست را بررسی کنید.</InlineNotice>}</>;
}
