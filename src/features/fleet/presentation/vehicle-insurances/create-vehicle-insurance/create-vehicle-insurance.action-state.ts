import type { CreateVehicleInsuranceError } from "../../../application/vehicle-insurances/create-vehicle-insurance/create-vehicle-insurance.contract";
import type { InsuranceFormValues } from "./create-vehicle-insurance.form-data";

export type CreateVehicleInsuranceActionState = {
  error?: CreateVehicleInsuranceError;
  formError?: "invalid_form" | "unavailable";
  values?: InsuranceFormValues;
};
