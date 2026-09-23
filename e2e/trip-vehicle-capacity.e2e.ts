import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  connectToE2EDatabase,
  createPerson,
  type E2EDatabaseAdapter,
} from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";

let adapter: E2EDatabaseAdapter;
const token = randomUUID().replace(/-/g, "").slice(0, 12);
const vehicleACode = `CAPA${token}`;
const vehicleBCode = `CAPB${token}`;
const travelAt = "2026-06-15 08:00:00";
const passengerNames = ["مسافر یک", "مسافر دو", "مسافر سه", "مسافر چهار"] as const;

const passengerIds: number[] = [];
let driverPersonId: number | undefined;
let driverId: number | undefined;
let licenseId: number | undefined;
let brandId: number | undefined;
let modelId: number | undefined;
let statusId: number | undefined;
const vehicleIds: number[] = [];
const assignmentIds: number[] = [];
let originId: number | undefined;
let destinationId: number | undefined;
let requestAId: number | undefined;
let requestBId: number | undefined;

const request = () => adapter.underlyingDriver().request();

async function insertId(
  sql: string,
  inputs: Record<string, string | number>,
): Promise<number> {
  let command = request();
  for (const [name, value] of Object.entries(inputs)) {
    command = command.input(name, value);
  }
  const result = await command.query<{ id: number }>(sql);
  return result.recordset[0].id;
}

async function openAssignment(page: Page, passengerName: string) {
  await page.getByRole("tab", { name: passengerName }).click();
}

async function searchAssignment(page: Page, vehicleCode: string) {
  await page.getByLabel("تخصیص واجد شرایط", { exact: true }).click();
  const panel = page.getByRole("dialog", { name: "جستجوی تخصیص واجد شرایط" });
  await panel.getByRole("combobox").fill(vehicleCode);
  return panel.getByRole("option", { name: vehicleCode });
}

test.describe("Trip request vehicle capacity", () => {
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    driverPersonId = await createPerson(adapter, {
      firstName: "راننده",
      lastName: `ظرفیت ${token}`,
      personnelNo: `E2E-CAP-D-${token}`,
      isActive: true,
    });
    for (const [index, name] of passengerNames.entries()) {
      const [firstName, lastName] = name.split(" ");
      passengerIds.push(
        await createPerson(adapter, {
          firstName,
          lastName,
          personnelNo: `E2E-CAP-P${index}-${token}`,
          isActive: true,
        }),
      );
    }

    originId = await insertId(
      `INSERT INTO common.Location (LocationName, LocationCode, IsActive)
       OUTPUT INSERTED.LocationId AS id
       VALUES (@name, @code, 1)`,
      { name: `مبدأ ظرفیت ${token}`, code: `CO-${token}` },
    );
    destinationId = await insertId(
      `INSERT INTO common.Location (LocationName, LocationCode, IsActive)
       OUTPUT INSERTED.LocationId AS id
       VALUES (@name, @code, 1)`,
      { name: `مقصد ظرفیت ${token}`, code: `CD-${token}` },
    );
    driverId = await insertId(
      `INSERT INTO driver.Driver (PersonId)
       OUTPUT INSERTED.DriverId AS id
       VALUES (@person)`,
      { person: driverPersonId },
    );
    licenseId = await insertId(
      `INSERT INTO driver.DriverLicense
         (DriverId, LicenseType, LicenseNo, IssueDate, ExpireDate, IsActive)
       OUTPUT INSERTED.DriverLicenseId AS id
       VALUES (@driver, N'پایه سوم', @number, '2020-01-01', '2035-01-01', 1)`,
      { driver: driverId, number: `E2E-CAP-LIC-${token}` },
    );
    brandId = await insertId(
      `INSERT INTO fleet.VehicleBrand (BrandName)
       OUTPUT INSERTED.BrandId AS id VALUES (@name)`,
      { name: `E2E-CAP-BRAND-${token}` },
    );
    modelId = await insertId(
      `INSERT INTO fleet.VehicleModel (ModelName, BrandId)
       OUTPUT INSERTED.ModelId AS id VALUES (@name, @brand)`,
      { name: `E2E-CAP-MODEL-${token}`, brand: brandId },
    );
    statusId = await insertId(
      `INSERT INTO fleet.VehicleStatus (StatusName)
       OUTPUT INSERTED.VehicleStatusId AS id VALUES (@name)`,
      { name: `E2E-CAP-ST-${token.slice(0, 8)}` },
    );

    const plates = [
      { code: vehicleACode, left: "۱۲", center: "ب", right: "۳۴۵", iran: "۱۱" },
      { code: vehicleBCode, left: "۲۱", center: "ج", right: "۵۴۳", iran: "۲۲" },
    ];
    for (const plate of plates) {
      const vehicleId = await insertId(
        `INSERT INTO fleet.Vehicle
           (VehicleCode, PlateNoLeftSide, PlateNoCenterChar,
            PlateNoRightSide, PlateNoIranNo, ModelId, VehicleStatusId)
         OUTPUT INSERTED.VehicleId AS id
         VALUES (@code, @left, @center, @right, @iran, @model, @status)`,
        {
          code: plate.code,
          left: plate.left,
          center: plate.center,
          right: plate.right,
          iran: plate.iran,
          model: modelId,
          status: statusId,
        },
      );
      vehicleIds.push(vehicleId);
      assignmentIds.push(
        await insertId(
          `INSERT INTO driver.VehicleDriverAssignment
             (DriverId, VehicleId, FromDateTime, ToDateTime)
           OUTPUT INSERTED.AssignmentId AS id
           VALUES (@driver, @vehicle, '2020-01-01', '2035-01-01')`,
          { driver: driverId, vehicle: vehicleId },
        ),
      );
    }

    const requestTypeId = (
      await request().query<{ id: number }>(
        `SELECT TOP (1) TripRequestTypeId AS id
         FROM trip.TripRequestType
         ORDER BY TripRequestTypeId`,
      )
    ).recordset[0]?.id;
    if (requestTypeId === undefined) {
      throw new Error("Trip request type is missing.");
    }
    async function createRequest(requestNo: string, people: number[]) {
      const id = await insertId(
        `INSERT INTO trip.TripRequest
           (RequestNo, TripRequestTypeId, RequestDateTime,
            RequestedTravelDateTime, Status, CreatedAt)
         OUTPUT INSERTED.TripRequestId AS id
         VALUES (@requestNo, @typeId, @travelAt, @travelAt, N'New', @travelAt)`,
        { requestNo, typeId: requestTypeId, travelAt },
      );
      for (const personId of people) {
        await insertId(
          `INSERT INTO trip.Trip
             (TripRequestId, PassengerPersonId, OriginLocationId,
              DestinationLocationId, RequestedPickupDateTime)
           OUTPUT INSERTED.TripId AS id
           VALUES (@requestId, @personId, @originId, @destinationId, @travelAt)`,
          {
            requestId: id,
            personId,
            originId: originId!,
            destinationId: destinationId!,
            travelAt,
          },
        );
      }
      return id;
    }

    requestAId = await createRequest(
      `E2E-CAP-A-${token}`,
      passengerIds.slice(0, 3),
    );
    requestBId = await createRequest(
      `E2E-CAP-B-${token}`,
      passengerIds.slice(3),
    );
  });

  test.afterAll(async () => {
    if (!adapter) return;
    try {
      for (const requestId of [requestAId, requestBId]) {
        if (requestId === undefined) continue;
        await request().input("requestId", requestId).query(`
          DELETE FROM trip.RoutePoint
          WHERE RouteId IN (
            SELECT RouteId FROM trip.Route
            WHERE TripId IN (SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId)
          );
          DELETE FROM trip.Route
          WHERE TripId IN (SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId);
          DELETE FROM trip.TripExecution
          WHERE TripId IN (SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId);
          DELETE FROM trip.Trip WHERE TripRequestId=@requestId;
          DELETE FROM trip.TripRequest WHERE TripRequestId=@requestId;
        `);
      }
      for (const id of assignmentIds) {
        await request()
          .input("id", id)
          .query(
            "DELETE FROM driver.VehicleDriverAssignment WHERE AssignmentId=@id",
          );
      }
      if (licenseId !== undefined) {
        await request()
          .input("id", licenseId)
          .query("DELETE FROM driver.DriverLicense WHERE DriverLicenseId=@id");
      }
      if (driverId !== undefined) {
        await request()
          .input("id", driverId)
          .query("DELETE FROM driver.Driver WHERE DriverId=@id");
      }
      for (const id of [driverPersonId, ...passengerIds]) {
        if (id === undefined) continue;
        await request()
          .input("id", id)
          .query("DELETE FROM person.People WHERE PersonId=@id");
      }
      for (const id of vehicleIds) {
        await request()
          .input("id", id)
          .query("DELETE FROM fleet.Vehicle WHERE VehicleId=@id");
      }
      if (modelId !== undefined) {
        await request()
          .input("id", modelId)
          .query("DELETE FROM fleet.VehicleModel WHERE ModelId=@id");
      }
      if (brandId !== undefined) {
        await request()
          .input("id", brandId)
          .query("DELETE FROM fleet.VehicleBrand WHERE BrandId=@id");
      }
      if (statusId !== undefined) {
        await request()
          .input("id", statusId)
          .query("DELETE FROM fleet.VehicleStatus WHERE VehicleStatusId=@id");
      }
      for (const id of [originId, destinationId]) {
        if (id === undefined) continue;
        await request()
          .input("id", id)
          .query("DELETE FROM common.Location WHERE LocationId=@id");
      }
    } finally {
      await adapter.dispose();
    }
  });

  test("disables a vehicle that already has three planned passengers on another request", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(60_000);
    const eventually = expect.configure({ timeout: 60_000 });
    await page.goto(`/trips/${requestAId}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByRole("button", { name: "بعدی: راننده و خودرو", exact: true }).click();
    await expect(page.getByLabel("تخصیص واجد شرایط", { exact: true })).toBeVisible();

    for (const passengerName of passengerNames.slice(0, 3)) {
      await openAssignment(page, passengerName);
      await selectSearchableOption(
        page,
        "تخصیص واجد شرایط",
        vehicleACode,
        vehicleACode,
      );
      await expect(page.getByText("آماده ثبت نهایی")).toBeVisible();
    }

    await page.getByRole("button", { name: "بعدی: مسیر سفر", exact: true }).click();
    await page
      .getByRole("button", { name: /بعدی: (تأیید و تخصیص|برنامه‌ریزی)/ })
      .click();
    await page.getByRole("button", { name: "تأیید و تخصیص سفر", exact: true }).click();
    await eventually(
      page.getByRole("navigation", { name: "بخش‌های پرونده سفر" }),
    ).toBeVisible();

    const planned = await request()
      .input("requestId", requestAId)
      .query<{ count: number }>(`
        SELECT COUNT(*) AS count
        FROM trip.TripExecution AS execution
        INNER JOIN trip.Trip AS trip ON trip.TripId = execution.TripId
        WHERE trip.TripRequestId = @requestId
          AND execution.Status = N'Planned'
      `);
    expect(planned.recordset[0].count).toBe(3);

    await page.goto(`/trips/${requestBId}`);
    await page.getByRole("button", { name: "بعدی: راننده و خودرو", exact: true }).click();
    const fullOption = await searchAssignment(page, vehicleACode);
    await expect(fullOption).toBeVisible();
    await expect(fullOption).toContainText("ظرفیت خودرو تکمیل شده");
    await expect(fullOption).toHaveAttribute("aria-disabled", "true");
    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await page.keyboard.press("Escape");

    await request().input("requestId", requestAId).query(`
      UPDATE trip.TripExecution
      SET Status = N'Cancelled'
      WHERE TripExecutionId = (
        SELECT TOP (1) execution.TripExecutionId
        FROM trip.TripExecution AS execution
        INNER JOIN trip.Trip AS trip ON trip.TripId = execution.TripId
        WHERE trip.TripRequestId = @requestId
          AND execution.Status = N'Planned'
      )
    `);

    await page.goto(`/trips/${requestBId}`);
    await page.getByRole("button", { name: "بعدی: راننده و خودرو", exact: true }).click();
    const releasedOption = await searchAssignment(page, vehicleACode);
    await expect(releasedOption).toBeVisible();
    await expect(releasedOption).not.toHaveAttribute("aria-disabled", "true");
    await releasedOption.click();
    await expect(page.getByText("آماده ثبت نهایی")).toBeVisible();
  });
});
