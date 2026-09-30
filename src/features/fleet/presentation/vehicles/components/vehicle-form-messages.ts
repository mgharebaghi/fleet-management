import type {
  VehicleFailureType,
  VehicleValidationCode,
} from "../../../application/vehicles/create-vehicle/create-vehicle.contract";
import type { NewVehicle } from "../../../application/vehicles/vehicle";

export const vehicleLabels: Record<keyof NewVehicle, string> = {
  vehicleCode: "کد خودرو",
  modelId: "مدل خودرو",
  vehicleStatusId: "وضعیت عملیاتی",
  modelYear: "سال ساخت",
  plateNoLeftSide: "دو رقم سمت چپ",
  plateNoCenterChar: "حرف یا بخش میانی",
  plateNoRightSide: "سه رقم سمت راست",
  plateNoIranNo: "کد ایران",
  internationalPlateNo: "پلاک بین‌المللی",
  vin: "شناسه VIN",
  engineNo: "شماره موتور",
  chassisNo: "شماره شاسی",
  purchaseDate: "تاریخ خرید (شمسی)",
  purchasePrice: "قیمت خرید",
  currentOdometer: "کیلومتر فعلی",
  currentEngineHour: "ساعت موتور",
};

/**
 * Short captions shown beside the plate inputs. The full wording in
 * vehicleLabels stays the accessible name of each part.
 */
export const vehiclePlatePartCaptions: Record<
  | "plateNoLeftSide"
  | "plateNoCenterChar"
  | "plateNoRightSide"
  | "plateNoIranNo",
  string
> = {
  plateNoLeftSide: "دو رقم",
  plateNoCenterChar: "حرف",
  plateNoRightSide: "سه رقم",
  plateNoIranNo: "ایران",
};

export const vehicleValidationMessages: Record<VehicleValidationCode, string> = {
  REQUIRED: "این مقدار را وارد کنید.",
  TOO_LONG: "تعداد نویسه‌ها بیش از حد مجاز است.",
  INVALID_PLATE:
    "تعداد ارقام این بخش پلاک صحیح نیست؛ فقط رقم وارد کنید.",
  INVALID_YEAR: "سال ساخت باید عدد صحیح بین ۱ و ۳۲۷۶۷ باشد.",
  INVALID_REFERENCE: "یک گزینه معتبر انتخاب کنید.",
  INVALID_DATE: "تاریخ شمسی معتبر به شکل سال/ماه/روز وارد کنید.",
  FUTURE_DATE: "تاریخ خرید نمی‌تواند در آینده باشد.",
  INVALID_DECIMAL:
    "عدد غیرمنفی با حداکثر ۱۶ رقم صحیح و ۲ رقم اعشار وارد کنید.",
};

export const vehicleFailureMessages: Record<
  VehicleFailureType,
  { field: keyof NewVehicle; message: string }
> = {
  VEHICLE_CODE_ALREADY_EXISTS: {
    field: "vehicleCode",
    message: "این کد خودرو قبلاً ثبت شده است.",
  },
  INTERNAL_PLATE_ALREADY_EXISTS: {
    field: "plateNoLeftSide",
    message: "این پلاک کامل قبلاً ثبت شده است.",
  },
  INTERNATIONAL_PLATE_ALREADY_EXISTS: {
    field: "internationalPlateNo",
    message: "این پلاک بین‌المللی قبلاً ثبت شده است.",
  },
  VIN_ALREADY_EXISTS: {
    field: "vin",
    message: "این شناسه VIN قبلاً ثبت شده است.",
  },
  ENGINE_NO_ALREADY_EXISTS: {
    field: "engineNo",
    message: "این شماره موتور قبلاً ثبت شده است.",
  },
  CHASSIS_NO_ALREADY_EXISTS: {
    field: "chassisNo",
    message: "این شماره شاسی قبلاً ثبت شده است.",
  },
  MODEL_NOT_FOUND: {
    field: "modelId",
    message: "مدل انتخاب‌شده دیگر موجود نیست؛ صفحه را تازه کنید.",
  },
  STATUS_NOT_FOUND: {
    field: "vehicleStatusId",
    message: "وضعیت انتخاب‌شده دیگر موجود نیست؛ صفحه را تازه کنید.",
  },
};
