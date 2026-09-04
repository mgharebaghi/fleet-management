import type { CreateVehicleModelValidationErrorCode } from "../../../application/catalogs/create-vehicle-model/create-vehicle-model.contract";
import type { CreateVehicleModelActionState } from "./create-vehicle-model.action-state";

type VehicleModelFieldErrors = {
  name: string[];
  brandId: string[];
  vehicleTypeId: string[];
  fuelTypeId: string[];
};

const nameValidationMessages: Record<
  CreateVehicleModelValidationErrorCode,
  string
> = {
  REQUIRED: "نام مدل الزامی است.",
  TOO_LONG: "نام مدل حداکثر ۱۰۰ کاراکتر می‌تواند باشد.",
};

export function getCreateVehicleModelFieldErrors(
  state: CreateVehicleModelActionState,
): VehicleModelFieldErrors {
  const errors: VehicleModelFieldErrors = {
    name: [],
    brandId: [],
    vehicleTypeId: [],
    fuelTypeId: [],
  };

  switch (state.status) {
    case "validation_error":
      errors.name = state.fieldErrors.name.map(
        (code) => nameValidationMessages[code],
      );
      break;
    case "brand_required":
      errors.brandId = ["انتخاب برند الزامی است."];
      break;
    case "vehicle_type_required":
      errors.vehicleTypeId = ["انتخاب نوع خودرو الزامی است."];
      break;
    case "fuel_type_required":
      errors.fuelTypeId = ["انتخاب نوع سوخت الزامی است."];
      break;
    case "brand_not_found":
      errors.brandId = ["برند انتخاب‌شده دیگر موجود نیست."];
      break;
    case "vehicle_type_not_found":
      errors.vehicleTypeId = ["نوع خودروی انتخاب‌شده معتبر نیست."];
      break;
    case "fuel_type_not_found":
      errors.fuelTypeId = ["نوع سوخت انتخاب‌شده معتبر نیست."];
      break;
  }

  return errors;
}

export function getCreateVehicleModelStatusMessage(
  state: CreateVehicleModelActionState,
): string | null {
  return state.status === "invalid_form"
    ? "داده‌های فرم قابل پردازش نیست. لطفاً دوباره تلاش کنید."
    : null;
}
