import { Prisma, type PrismaClient } from "../../../../../generated/prisma/client";
import type { InsuranceVehicleReader } from "../../../application/vehicle-insurances/ports/insurance-vehicle-reader";
import type { VehicleInsuranceReader } from "../../../application/vehicle-insurances/ports/vehicle-insurance-reader";
import {
  InsuranceVehicleNotFoundError,
  VehicleInsuranceNotFoundError,
  type UpdateVehicleInsuranceChanges,
  type VehicleInsuranceWriter,
} from "../../../application/vehicle-insurances/ports/vehicle-insurance-writer";
import type { InsuranceVehicle, NewVehicleInsurance, VehicleInsuranceSearchCriteria, VehicleInsuranceSearchResult, VehicleInsuranceSummary } from "../../../application/vehicle-insurances/vehicle-insurance";

const vehicleSelect = {
  VehicleId: true, VehicleCode: true, PlateNoLeftSide: true,
  PlateNoCenterChar: true, PlateNoRightSide: true, PlateNoIranNo: true, IsActive: true,
  VehicleModel: { select: { ModelName: true, VehicleBrand: { select: { BrandName: true } } } },
} satisfies Prisma.VehicleSelect;

function mapVehicle(row: Prisma.VehicleGetPayload<{ select: typeof vehicleSelect }>): InsuranceVehicle {
  return {
    vehicleId: row.VehicleId, vehicleCode: row.VehicleCode,
    brandName: row.VehicleModel.VehicleBrand.BrandName, modelName: row.VehicleModel.ModelName,
    plateNoLeftSide: row.PlateNoLeftSide, plateNoCenterChar: row.PlateNoCenterChar,
    plateNoRightSide: row.PlateNoRightSide, plateNoIranNo: row.PlateNoIranNo,
    isActive: row.IsActive,
  };
}

export class PrismaVehicleInsuranceRepository implements VehicleInsuranceReader, VehicleInsuranceWriter, InsuranceVehicleReader {
  constructor(private readonly client: Pick<PrismaClient, "vehicleInsurance" | "vehicle" | "$queryRaw">) {}

  async vehicleExists(vehicleId: number) {
    return await this.client.vehicle.findUnique({ where: { VehicleId: vehicleId }, select: { VehicleId: true } }) !== null;
  }

  async listVehicles() {
    const rows = await this.client.vehicle.findMany({ select: vehicleSelect, orderBy: { VehicleId: "desc" } });
    return rows.map(mapVehicle);
  }

  async create(input: NewVehicleInsurance) {
    const decimal = (value: string | null) => value === null ? null : new Prisma.Decimal(value);
    try {
      const row = await this.client.vehicleInsurance.create({
        data: {
          VehicleId: input.vehicleId, InsuranceType: input.insuranceType,
          InsuranceCompany: input.insuranceCompany, PolicyNo: input.policyNo,
          StartDate: input.startDate, ExpireDate: input.expireDate,
          PremiumAmount: decimal(input.premiumAmount), CoverageAmount: decimal(input.coverageAmount),
        },
        select: { VehicleInsuranceId: true },
      });
      return { vehicleInsuranceId: row.VehicleInsuranceId.toString() };
    } catch (error) {
      // VehicleInsurance has one FK: its vehicle reference.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new InsuranceVehicleNotFoundError();
      throw error;
    }
  }

  async findById(vehicleInsuranceId: string): Promise<VehicleInsuranceSummary | null> {
    const id = BigInt(vehicleInsuranceId);
    const row = await this.client.vehicleInsurance.findUnique({
      where: { VehicleInsuranceId: id },
      select: {
        VehicleInsuranceId: true, VehicleId: true, InsuranceType: true,
        InsuranceCompany: true, PolicyNo: true, StartDate: true, ExpireDate: true,
        IsActive: true, Vehicle: { select: vehicleSelect },
      },
    });
    if (row === null) return null;

    const [amount] = await this.client.$queryRaw<Array<{ premium: string | null; coverage: string | null }>>(Prisma.sql`
      SELECT CONVERT(varchar(40), PremiumAmount) AS premium, CONVERT(varchar(40), CoverageAmount) AS coverage
      FROM fleet.VehicleInsurance
      WHERE VehicleInsuranceId = ${id}
    `);
    if (!amount) throw new Error("Vehicle insurance changed while reading its amounts.");

    return {
      vehicleInsuranceId: row.VehicleInsuranceId.toString(), vehicleId: row.VehicleId,
      insuranceType: row.InsuranceType, insuranceCompany: row.InsuranceCompany, policyNo: row.PolicyNo,
      startDate: row.StartDate, expireDate: row.ExpireDate,
      premiumAmount: amount.premium, coverageAmount: amount.coverage,
      isActive: row.IsActive, vehicle: mapVehicle(row.Vehicle),
    };
  }

  async update(vehicleInsuranceId: string, changes: UpdateVehicleInsuranceChanges): Promise<void> {
    const decimal = (value: string | null) => value === null ? null : new Prisma.Decimal(value);
    try {
      await this.client.vehicleInsurance.update({
        where: { VehicleInsuranceId: BigInt(vehicleInsuranceId) },
        data: {
          VehicleId: changes.vehicleId, InsuranceType: changes.insuranceType,
          InsuranceCompany: changes.insuranceCompany, PolicyNo: changes.policyNo,
          StartDate: changes.startDate, ExpireDate: changes.expireDate,
          PremiumAmount: decimal(changes.premiumAmount), CoverageAmount: decimal(changes.coverageAmount),
          IsActive: changes.isActive,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new VehicleInsuranceNotFoundError();
        if (error.code === "P2003") throw new InsuranceVehicleNotFoundError();
      }
      throw error;
    }
  }

  async remove(vehicleInsuranceId: string): Promise<void> {
    try {
      await this.client.vehicleInsurance.delete({
        where: { VehicleInsuranceId: BigInt(vehicleInsuranceId) },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new VehicleInsuranceNotFoundError();
      }
      throw error;
    }
  }

  async search(criteria: VehicleInsuranceSearchCriteria): Promise<VehicleInsuranceSearchResult> {
    const where: Prisma.VehicleInsuranceWhereInput = {};
    if (criteria.isActive !== null) where.IsActive = criteria.isActive;
    if (criteria.search !== null) {
      const contains = { contains: criteria.search };
      where.OR = [
        { InsuranceType: contains }, { InsuranceCompany: contains }, { PolicyNo: contains },
        { Vehicle: { VehicleCode: contains } }, { Vehicle: { PlateNoLeftSide: contains } },
        { Vehicle: { PlateNoCenterChar: contains } }, { Vehicle: { PlateNoRightSide: contains } },
        { Vehicle: { PlateNoIranNo: contains } },
        { Vehicle: { VehicleModel: { ModelName: contains } } },
        { Vehicle: { VehicleModel: { VehicleBrand: { BrandName: contains } } } },
      ];
    }
    const [rows, totalCount] = await Promise.all([
      this.client.vehicleInsurance.findMany({
        where,
        select: {
          VehicleInsuranceId: true, VehicleId: true, InsuranceType: true,
          InsuranceCompany: true, PolicyNo: true, StartDate: true, ExpireDate: true,
          IsActive: true, Vehicle: { select: vehicleSelect },
        },
        orderBy: { VehicleInsuranceId: "desc" },
        skip: (criteria.pageNumber - 1) * criteria.pageSize, take: criteria.pageSize,
      }),
      this.client.vehicleInsurance.count({ where }),
    ]);
    if (!rows.length) return { insurances: [], totalCount };

    // MSSQL decimal decoding can pass through a JS number. Read only this page's
    // amounts as SQL text, preserving every digit without changing the schema.
    const amounts = await this.client.$queryRaw<Array<{ id: string; premium: string | null; coverage: string | null }>>(Prisma.sql`
      SELECT CONVERT(varchar(20), VehicleInsuranceId) AS id,
        CONVERT(varchar(40), PremiumAmount) AS premium,
        CONVERT(varchar(40), CoverageAmount) AS coverage
      FROM fleet.VehicleInsurance
      WHERE VehicleInsuranceId IN (${Prisma.join(rows.map(row => row.VehicleInsuranceId))})
    `);
    const amountById = new Map(amounts.map(amount => [amount.id, amount]));
    return {
      totalCount,
      insurances: rows.map(row => {
        const vehicleInsuranceId = row.VehicleInsuranceId.toString();
        const amount = amountById.get(vehicleInsuranceId);
        if (!amount) throw new Error("Insurance changed while reading its amounts.");
        return {
          vehicleInsuranceId, vehicleId: row.VehicleId,
          insuranceType: row.InsuranceType, insuranceCompany: row.InsuranceCompany, policyNo: row.PolicyNo,
          startDate: row.StartDate, expireDate: row.ExpireDate,
          premiumAmount: amount.premium, coverageAmount: amount.coverage,
          isActive: row.IsActive, vehicle: mapVehicle(row.Vehicle),
        };
      }),
    };
  }
}
