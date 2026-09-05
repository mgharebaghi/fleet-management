export type InternalPlate = {
  plateNoLeftSide: string;
  plateNoCenterChar: string;
  plateNoRightSide: string;
  plateNoIranNo: string;
};

export type NewVehicle = InternalPlate & {
  vehicleCode: string;
  internationalPlateNo: string | null;
  vin: string | null;
  engineNo: string | null;
  chassisNo: string | null;
  modelId: number;
  vehicleStatusId: number;
  modelYear: number | null;
  purchaseDate: Date | null;
  purchasePrice: string | null;
  currentOdometer: string | null;
  currentEngineHour: string | null;
};

type ReferenceSummary = { id: number; name: string };
export type VehicleSummary = {
  vehicleId: number;
  vehicleCode: string;
  plateNoLeftSide: string;
  plateNoCenterChar: string | null;
  plateNoRightSide: string | null;
  plateNoIranNo: string | null;
  internationalPlateNo: string | null;
  vin: string | null;
  modelYear: number | null;
  isActive: boolean;
  model: ReferenceSummary;
  brand: ReferenceSummary;
  vehicleType: ReferenceSummary | null;
  fuelType: ReferenceSummary | null;
  status: ReferenceSummary;
};

export type VehicleSearchCriteria = {
  search: string | null;
  pageNumber: number;
  pageSize: number;
  isActive: boolean | null;
  vehicleStatusId: number | null;
};
export type VehicleSearchResult = { vehicles: VehicleSummary[]; totalCount: number };
