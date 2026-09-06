import type { InsuranceValidationCode } from "../../../application/vehicle-insurances/create-vehicle-insurance/create-vehicle-insurance.contract";
import type { InsuranceFormValues } from "./create-vehicle-insurance.form-data";

export const insuranceLabels: Record<keyof InsuranceFormValues, string> = {
  vehicleId: "خودرو", insuranceType: "نوع بیمه", insuranceCompany: "شرکت بیمه", policyNo: "شماره بیمه‌نامه",
  startDate: "تاریخ شروع (شمسی)", expireDate: "تاریخ انقضا (شمسی)",
  premiumAmount: "حق بیمه", coverageAmount: "سقف پوشش",
};
export const insuranceValidationMessages: Record<InsuranceValidationCode, string> = {
  REQUIRED: "این مقدار را وارد کنید.", TOO_LONG: "تعداد نویسه‌ها بیش از حد مجاز است.",
  INVALID_VEHICLE: "یک خودرو انتخاب کنید.", INVALID_DATE: "یک تاریخ معتبر انتخاب کنید.",
  DATE_ORDER: "تاریخ انقضا نمی‌تواند پیش از تاریخ شروع باشد.",
  INVALID_DECIMAL: "عدد غیرمنفی با حداکثر ۱۶ رقم صحیح و ۲ رقم اعشار وارد کنید.",
};
