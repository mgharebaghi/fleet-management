import type { CreateVehicleInsuranceError } from "../../../application/vehicle-insurances/create-vehicle-insurance/create-vehicle-insurance.contract";
import type { InsuranceFormValues } from "../create-vehicle-insurance/create-vehicle-insurance.form-data";

export type UpdateVehicleInsuranceActionState = {
  error?: CreateVehicleInsuranceError;
  formError?: "invalid_form" | "unavailable" | "not_found";
  values?: InsuranceFormValues;
};
