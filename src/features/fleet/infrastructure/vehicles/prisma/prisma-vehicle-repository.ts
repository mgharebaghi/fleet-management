import { Prisma, type PrismaClient } from "../../../../../generated/prisma/client";
import type { VehicleWriter } from "../../../application/vehicles/ports/vehicle-writer";
import type { VehicleReader } from "../../../application/vehicles/ports/vehicle-reader";
import type { VehicleIdentifierReader, VehicleIdentifier } from "../../../application/vehicles/ports/vehicle-identifier-reader";
import type { VehicleReferenceReader } from "../../../application/vehicles/ports/vehicle-reference-reader";
import type { NewVehicle, InternalPlate, VehicleSummary, VehicleSearchCriteria } from "../../../application/vehicles/vehicle";

const vehicleSelect = {
  VehicleId: true, VehicleCode: true, PlateNoLeftSide: true, PlateNoCenterChar: true,
  PlateNoRightSide: true, PlateNoIranNo: true, InternationalPlateNo: true, VIN: true,
  ModelYear: true, IsActive: true,
  VehicleStatus: { select: { VehicleStatusId: true, StatusName: true } },
  VehicleModel: { select: { ModelId: true, ModelName: true,
    VehicleBrand: { select: { BrandId: true, BrandName: true } },
    VehicleType: { select: { VehicleTypeId: true, TypeName: true } },
    FuelType: { select: { FuelTypeId: true, FuelTypeName: true } },
  } },
} satisfies Prisma.VehicleSelect;
type SelectedVehicle = Prisma.VehicleGetPayload<{ select: typeof vehicleSelect }>;
function mapVehicle(row: SelectedVehicle): VehicleSummary {
  const model = row.VehicleModel;
  return {
    vehicleId: row.VehicleId, vehicleCode: row.VehicleCode,
    plateNoLeftSide: row.PlateNoLeftSide, plateNoCenterChar: row.PlateNoCenterChar,
    plateNoRightSide: row.PlateNoRightSide, plateNoIranNo: row.PlateNoIranNo,
    internationalPlateNo: row.InternationalPlateNo, vin: row.VIN, modelYear: row.ModelYear, isActive: row.IsActive,
    model: { id: model.ModelId, name: model.ModelName },
    brand: { id: model.VehicleBrand.BrandId, name: model.VehicleBrand.BrandName },
    vehicleType: model.VehicleType ? { id: model.VehicleType.VehicleTypeId, name: model.VehicleType.TypeName } : null,
    fuelType: model.FuelType ? { id: model.FuelType.FuelTypeId, name: model.FuelType.FuelTypeName } : null,
    status: { id: row.VehicleStatus.VehicleStatusId, name: row.VehicleStatus.StatusName },
  };
}
const identifierColumns = { vehicleCode: "VehicleCode", internationalPlateNo: "InternationalPlateNo", vin: "VIN", engineNo: "EngineNo", chassisNo: "ChassisNo" } as const;
// Every value the vehicle list shows is searchable. Plate parts are matched
// individually because the list never stores a concatenated plate.
function buildSearchFilters(search: string): Prisma.VehicleWhereInput[] {
  const contains = { contains: search };
  const filters: Prisma.VehicleWhereInput[] = [
    { VehicleCode: contains },
    { PlateNoLeftSide: contains },
    { PlateNoCenterChar: contains },
    { PlateNoRightSide: contains },
    { PlateNoIranNo: contains },
    { InternationalPlateNo: contains },
    { VIN: contains },
    { EngineNo: contains },
    { ChassisNo: contains },
    { VehicleStatus: { StatusName: contains } },
    { VehicleModel: { ModelName: contains } },
    { VehicleModel: { VehicleBrand: { BrandName: contains } } },
    { VehicleModel: { VehicleType: { TypeName: contains } } },
    { VehicleModel: { FuelType: { FuelTypeName: contains } } },
  ];

  const modelYear = parseModelYear(search);
  if (modelYear !== null) filters.push({ ModelYear: modelYear });

  return filters;
}

// ModelYear is a smallint, so it is matched exactly rather than by substring.
function parseModelYear(search: string): number | null {
  if (!/^\d{1,5}$/.test(search)) return null;
  const modelYear = Number(search);
  return modelYear >= 1 && modelYear <= 32767 ? modelYear : null;
}

export class PrismaVehicleRepository implements VehicleWriter, VehicleReader, VehicleIdentifierReader, VehicleReferenceReader {
  constructor(private readonly client: Pick<PrismaClient, "vehicle" | "vehicleModel" | "vehicleStatus">) {}
  async identifierExists(identifier: VehicleIdentifier, value: string) {
    return await this.client.vehicle.findFirst({ where: { [identifierColumns[identifier]]: value }, select: { VehicleId: true } }) !== null;
  }
  async internalPlateExists(plate: InternalPlate) {
    return await this.client.vehicle.findFirst({ where: {
      PlateNoLeftSide: plate.plateNoLeftSide, PlateNoCenterChar: plate.plateNoCenterChar,
      PlateNoRightSide: plate.plateNoRightSide, PlateNoIranNo: plate.plateNoIranNo,
    }, select: { VehicleId: true } }) !== null;
  }
  async modelExists(modelId: number) {
    return await this.client.vehicleModel.findUnique({ where: { ModelId: modelId }, select: { ModelId: true } }) !== null;
  }
  async statusExists(vehicleStatusId: number) {
    return await this.client.vehicleStatus.findUnique({ where: { VehicleStatusId: vehicleStatusId }, select: { VehicleStatusId: true } }) !== null;
  }
  async create(input: NewVehicle) {
    const decimal = (value: string | null) => value === null ? null : new Prisma.Decimal(value);
    const result = await this.client.vehicle.create({ data: {
      VehicleCode: input.vehicleCode, PlateNoLeftSide: input.plateNoLeftSide,
      PlateNoCenterChar: input.plateNoCenterChar, PlateNoRightSide: input.plateNoRightSide, PlateNoIranNo: input.plateNoIranNo,
      InternationalPlateNo: input.internationalPlateNo, VIN: input.vin, EngineNo: input.engineNo, ChassisNo: input.chassisNo,
      ModelId: input.modelId, VehicleStatusId: input.vehicleStatusId, ModelYear: input.modelYear,
      PurchaseDate: input.purchaseDate, PurchasePrice: decimal(input.purchasePrice),
      CurrentOdometer: decimal(input.currentOdometer), CurrentEngineHour: decimal(input.currentEngineHour),
    }, select: { VehicleId: true } });
    return { vehicleId: result.VehicleId };
  }
  async search(criteria: VehicleSearchCriteria) {
    const where: Prisma.VehicleWhereInput = {};
    if (criteria.isActive !== null) where.IsActive = criteria.isActive;
    if (criteria.vehicleStatusId !== null) where.VehicleStatusId = criteria.vehicleStatusId;
    if (criteria.search !== null) where.OR = buildSearchFilters(criteria.search);
    const [rows, totalCount] = await Promise.all([
      this.client.vehicle.findMany({ where, select: vehicleSelect, orderBy: { VehicleId: "desc" }, skip: (criteria.pageNumber - 1) * criteria.pageSize, take: criteria.pageSize }),
      this.client.vehicle.count({ where }),
    ]);
    return { vehicles: rows.map(mapVehicle), totalCount };
  }
}
