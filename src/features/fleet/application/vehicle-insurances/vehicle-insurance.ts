export type NewVehicleInsurance = {
  vehicleId: number;
  insuranceType: string;
  insuranceCompany: string | null;
  policyNo: string | null;
  startDate: Date;
  expireDate: Date;
  premiumAmount: string | null;
  coverageAmount: string | null;
};

export type InsuranceVehicle = {
  vehicleId: number;
  vehicleCode: string;
  brandName: string;
  modelName: string;
  plateNoLeftSide: string;
  plateNoCenterChar: string | null;
  plateNoRightSide: string | null;
  plateNoIranNo: string | null;
  isActive: boolean;
};

export type VehicleInsuranceSummary = NewVehicleInsurance & {
  vehicleInsuranceId: string;
  isActive: boolean;
  vehicle: InsuranceVehicle;
};

export type VehicleInsuranceSearchCriteria = {
  search: string | null;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
};

export type VehicleInsuranceSearchResult = {
  insurances: VehicleInsuranceSummary[];
  totalCount: number;
};
