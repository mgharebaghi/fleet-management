import type { VehicleMeterFailure } from "../../application/meter-readings/vehicle-meter-records";
export type VehicleMeterFormState = { saved?: boolean; error?: VehicleMeterFailure; unavailable?: boolean };
export const meterFailureMessages = {
  NOT_FOUND: "خودرو پیدا نشد؛ صفحه را به‌روزرسانی کنید.", HISTORY_INVALID: "کارکرد فعلی یا سوابق قبلی خودرو با هم سازگار نیستند؛ ابتدا داده‌های قبلی بررسی شوند.",
  METRIC_REQUIRED: "حداقل کیلومتر یا ساعت کارکرد را وارد کنید.", INVALID_RECORDED_AT: "تاریخ و ساعت ثبت را معتبر و کامل انتخاب کنید.", FUTURE_READING: "تاریخ و ساعت کارکرد نمی‌تواند در آینده باشد.",
};
export function meterFieldErrors(state: VehicleMeterFormState, name: string): string[] {
  if (state.error?.type !== "VALIDATION_ERROR") return [];
  const fields = state.error.fields;
  const code = fields[name as keyof typeof fields];
  if (!code) return [];
  return [{ REQUIRED: "این مقدار را وارد کنید.", INVALID: "عدد غیرمنفی با حداکثر ۱۶ رقم صحیح و ۲ رقم اعشار وارد کنید.", TOO_LONG: "یادداشت حداکثر ۵۰۰ نویسه باشد.", FUTURE: "تاریخ و ساعت نمی‌تواند در آینده باشد.", DECREASE: "کارکرد نمی‌تواند از مقدار فعلی یا سابقهٔ قبلی کمتر باشد.", AFTER_NEXT: "این کارکرد از سابقهٔ بعدی بیشتر است؛ تاریخ و مقدار را بررسی کنید." }[code]];
}
