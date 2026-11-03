import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { orderFailureMessages, type WorkOrderFormState } from "./work-order-form-state";
export function WorkOrderFeedback({ state }: { state: WorkOrderFormState }) {
  return <>{state.error && <InlineNotice role="alert" tone="danger">{state.error.type === "VALIDATION_ERROR" ? "اطلاعات مشخص‌شده را اصلاح کنید." : orderFailureMessages[state.error.type]}</InlineNotice>}{state.unavailable && <InlineNotice role="alert" tone="danger">ثبت اطلاعات امکان‌پذیر نبود. پیش از تلاش دوباره، فهرست پرونده‌ها را بررسی کنید.</InlineNotice>}</>;
}
