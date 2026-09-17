import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  connectToE2EDatabase,
  createPerson,
  type E2EDatabaseAdapter,
} from "./support/e2e-database";
import { selectJalaliDate } from "./support/jalali-calendar";
import { selectSearchableOption } from "./support/searchable-select";

let adapter: E2EDatabaseAdapter;
let personId: number | undefined;
let originId: number | undefined;
let destinationId: number | undefined;
let driverId: number | undefined;
let licenseId: number | undefined;
let brandId: number | undefined;
let modelId: number | undefined;
let statusId: number | undefined;
let vehicleId: number | undefined;
let assignmentId: number | undefined;
let requestId: number | undefined;
const token = randomUUID();
const request = () => adapter.underlyingDriver().request();

test.describe.serial("Trip management", () => {
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    const baseline = await request().query<{
      tripRequest: number | null;
      trip: number | null;
      execution: number | null;
      route: number | null;
      point: number | null;
      location: number | null;
      requestTypes: number;
    }>(`SELECT
      OBJECT_ID(N'trip.TripRequest') AS tripRequest,
      OBJECT_ID(N'trip.Trip') AS trip,
      OBJECT_ID(N'trip.TripExecution') AS execution,
      OBJECT_ID(N'trip.Route') AS route,
      OBJECT_ID(N'trip.RoutePoint') AS point,
      OBJECT_ID(N'common.Location') AS location,
      (SELECT COUNT(*) FROM trip.TripRequestType) AS requestTypes`);
    const identity = baseline.recordset[0];
    if (
      !identity?.tripRequest ||
      !identity.trip ||
      !identity.execution ||
      !identity.route ||
      !identity.point ||
      !identity.location ||
      identity.requestTypes < 3
    ) {
      throw new Error("Trip E2E baseline is missing.");
    }

    personId = await createPerson(adapter, {
      firstName: "مسافر",
      lastName: token,
      personnelNo: `E2E-TRIP-${token}`,
      isActive: true,
    });
    originId = (
      await request()
        .input("name", `مبدأ ${token}`)
        .input("code", `O-${token}`)
        .query<{ id: number }>(
          `INSERT INTO common.Location (LocationName, LocationCode, IsActive)
           OUTPUT INSERTED.LocationId AS id
           VALUES (@name, @code, 1)`,
        )
    ).recordset[0].id;
    destinationId = (
      await request()
        .input("name", `مقصد ${token}`)
        .input("code", `D-${token}`)
        .query<{ id: number }>(
          `INSERT INTO common.Location (LocationName, LocationCode, IsActive)
           OUTPUT INSERTED.LocationId AS id
           VALUES (@name, @code, 1)`,
        )
    ).recordset[0].id;
    driverId = (
      await request()
        .input("person", personId)
        .query<{ id: number }>(
          `INSERT INTO driver.Driver (PersonId)
           OUTPUT INSERTED.DriverId AS id
           VALUES (@person)`,
        )
    ).recordset[0].id;
    licenseId = (
      await request()
        .input("driver", driverId)
        .input("number", `E2E-LIC-${token}`)
        .query<{ id: number }>(
          `INSERT INTO driver.DriverLicense
             (DriverId, LicenseType, LicenseNo, IssueDate, ExpireDate, IsActive)
           OUTPUT INSERTED.DriverLicenseId AS id
           VALUES
             (@driver, N'آزمون سفر', @number, '2025-01-01', '2027-01-01', 1)`,
        )
    ).recordset[0].id;
    brandId = (
      await request()
        .input("name", `E2E-TRIP-BRAND-${token}`)
        .query<{ id: number }>(
          `INSERT INTO fleet.VehicleBrand (BrandName)
           OUTPUT INSERTED.BrandId AS id VALUES (@name)`,
        )
    ).recordset[0].id;
    modelId = (
      await request()
        .input("name", `E2E-TRIP-MODEL-${token}`)
        .input("brand", brandId)
        .query<{ id: number }>(
          `INSERT INTO fleet.VehicleModel (ModelName, BrandId)
           OUTPUT INSERTED.ModelId AS id VALUES (@name, @brand)`,
        )
    ).recordset[0].id;
    statusId = (
      await request()
        .input("name", `E2E-TRIP-STATUS-${token}`)
        .query<{ id: number }>(
          `INSERT INTO fleet.VehicleStatus (StatusName)
           OUTPUT INSERTED.VehicleStatusId AS id VALUES (@name)`,
        )
    ).recordset[0].id;
    vehicleId = (
      await request()
        .input("code", `E2E-TRIP-VEHICLE-${token}`)
        .input("model", modelId)
        .input("status", statusId)
        .query<{ id: number }>(
          `INSERT INTO fleet.Vehicle
             (VehicleCode, PlateNoLeftSide, PlateNoCenterChar,
              PlateNoRightSide, PlateNoIranNo, ModelId, VehicleStatusId)
           OUTPUT INSERTED.VehicleId AS id
           VALUES (@code, N'۱۲', N'ب', N'۳۴۵', N'۶۷', @model, @status)`,
        )
    ).recordset[0].id;
    assignmentId = (
      await request()
        .input("driver", driverId)
        .input("vehicle", vehicleId)
        .query<{ id: number }>(
          `INSERT INTO driver.VehicleDriverAssignment
             (DriverId, VehicleId, FromDateTime, ToDateTime)
           OUTPUT INSERTED.AssignmentId AS id
           VALUES (@driver, @vehicle, '2025-01-01', '2027-01-01')`,
        )
    ).recordset[0].id;
  });

  test.afterAll(async () => {
    if (!adapter) return;
    try {
      if (requestId !== undefined) {
        await request()
          .input("requestId", requestId)
          .query(`
            DELETE FROM trip.RoutePoint
            WHERE RouteId IN (
              SELECT RouteId FROM trip.Route
              WHERE TripId IN (
                SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId
              )
              OR TripExecutionId IN (
                SELECT TripExecutionId FROM trip.TripExecution
                WHERE TripId IN (
                  SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId
                )
              )
            );
            DELETE FROM trip.Route
            WHERE TripId IN (
              SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId
            )
            OR TripExecutionId IN (
              SELECT TripExecutionId FROM trip.TripExecution
              WHERE TripId IN (
                SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId
              )
            );
            DELETE FROM trip.TripExecution
            WHERE TripId IN (
              SELECT TripId FROM trip.Trip WHERE TripRequestId=@requestId
            );
            DELETE FROM trip.Trip WHERE TripRequestId=@requestId;
            DELETE FROM trip.TripRequest WHERE TripRequestId=@requestId;
          `);
      }
      if (assignmentId !== undefined) {
        await request()
          .input("id", assignmentId)
          .query(
            "DELETE FROM driver.VehicleDriverAssignment WHERE AssignmentId=@id",
          );
      }
      if (licenseId !== undefined) {
        await request()
          .input("id", licenseId)
          .query(
            "DELETE FROM driver.DriverLicense WHERE DriverLicenseId=@id",
          );
      }
      if (driverId !== undefined) {
        await request()
          .input("id", driverId)
          .query("DELETE FROM driver.Driver WHERE DriverId=@id");
      }
      if (personId !== undefined) {
        await request()
          .input("id", personId)
          .query("DELETE FROM person.People WHERE PersonId=@id");
      }
      if (vehicleId !== undefined) {
        await request()
          .input("id", vehicleId)
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
        if (id !== undefined) {
          await request()
            .input("id", id)
            .query("DELETE FROM common.Location WHERE LocationId=@id");
        }
      }
      if (requestId !== undefined) {
        const remaining = await request()
          .input("requestId", requestId)
          .query<{ count: number }>(
            "SELECT COUNT(*) AS count FROM trip.TripRequest WHERE TripRequestId=@requestId",
          );
        expect(remaining.recordset[0].count).toBe(0);
      }
    } finally {
      await adapter.dispose();
    }
  });

  test(
    "creates, plans, prints and reconciles a Trip request",
    async ({ page }) => {
      test.setTimeout(600_000);
      await page.goto("/trips");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(
        page.getByRole("link", { name: /ثبت درخواست سفر/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /مشاهده سفرها/ }),
      ).toBeVisible();

      await page.getByRole("link", { name: /ثبت درخواست سفر/ }).click();
      const form = page.getByRole("form", { name: "ثبت درخواست سفر" });
      await form
        .getByLabel("نوع درخواست", { exact: true })
        .selectOption({ label: "مبدأ و مقصد مشترک" });
      await form
        .getByRole("button", {
          name: "تاریخ ثبت درخواست (شمسی)",
          exact: true,
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ ثبت درخواست (شمسی)",
        }),
        1404,
        "فروردین",
        "۱",
      );
      await form
        .getByLabel("ساعت ثبت (تهران)", { exact: true })
        .selectOption("08");
      await form
        .getByRole("button", {
          name: "تاریخ برنامه‌ریزی‌شده (شمسی)",
          exact: true,
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ برنامه‌ریزی‌شده (شمسی)",
        }),
        1404,
        "فروردین",
        "۲",
      );
      await form
        .getByLabel("ساعت برنامه‌ریزی‌شده (تهران)", { exact: true })
        .selectOption("08");
      await form.getByLabel("هدف سفر", { exact: true }).fill(`هدف ${token}`);
      await selectSearchableOption(form, "مسافر", token, token);
      await selectSearchableOption(form, "مبدأ", token, `مبدأ ${token}`);
      await selectSearchableOption(form, "مقصد", token, `مقصد ${token}`);
      await form
        .getByRole("button", { name: "ثبت درخواست سفر", exact: true })
        .click();

      await expect(page).toHaveURL(/\/trips\/\d+$/);
      requestId = Number(page.url().split("/").pop());
      await expect(page.getByText(/درخواست TR-1404-\d{4}/)).toBeVisible();
      await expect(page.getByText("جدید", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "بخش‌های پرونده سفر" }),
      ).toBeVisible();

      const statusForm = page.getByRole("form", {
        name: "تغییر وضعیت درخواست سفر",
      });
      await statusForm
        .getByLabel("وضعیت جدید", { exact: true })
        .selectOption("Assigned");
      await statusForm
        .getByRole("button", { name: "ثبت تغییر وضعیت" })
        .click();
      await expect(page.getByText("تخصیص‌یافته", { exact: true })).toBeVisible();

      await page.getByRole("link", { name: "مسافران", exact: true }).click();
      await expect(page.getByText(`مسافر ${token}`)).toBeVisible();
      await expect(page.getByText(`مبدأ ${token}`, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`مقصد ${token}`, { exact: true }),
      ).toBeVisible();

      await page.getByRole("link", { name: "مسیر", exact: true }).click();
      const routeForm = page.getByRole("form", {
        name: "ثبت مسیر برنامه‌ریزی‌شده",
      });
      await selectSearchableOption(
        routeForm,
        "سفر مسافر",
        token,
        token,
      );
      await routeForm
        .getByLabel("نام مسیر", { exact: true })
        .fill(`مسیر ${token}`);
      await routeForm
        .getByLabel("مسافت (کیلومتر)", { exact: true })
        .fill("24.50");
      await selectSearchableOption(routeForm, "مکان", token, `مبدأ ${token}`);
      await routeForm.getByRole("button", { name: "ثبت مسیر" }).click();
      await expect(page.getByText(`مسیر ${token}`, { exact: true })).toBeVisible();

      await page
        .getByRole("link", { name: "اجراء و زمان‌بندی", exact: true })
        .click();
      const planningForm = page.getByRole("form", {
        name: "ثبت برنامهٔ اجرا",
      });
      await selectSearchableOption(
        planningForm,
        "تخصیص خودرو و راننده در زمان سفر",
        token,
        token,
      );
      await planningForm
        .getByRole("button", { name: "ثبت برنامهٔ اجرا" })
        .click();
      await expect(
        page.getByText("برنامه‌ریزی‌شده", { exact: true }),
      ).toBeVisible();

      await page
        .getByRole("link", { name: "اطلاعات عمومی", exact: true })
        .click();
      const progressForm = page.getByRole("form", {
        name: "تغییر وضعیت درخواست سفر",
      });
      await progressForm
        .getByLabel("وضعیت جدید", { exact: true })
        .selectOption("InProgress");
      await progressForm
        .getByRole("button", { name: "ثبت تغییر وضعیت" })
        .click();

      await page
        .getByRole("link", { name: "اجراء و زمان‌بندی", exact: true })
        .click();
      const executionForm = page.getByRole("form", {
        name: "اصلاح اجرای سفر",
      });
      await executionForm
        .getByLabel("وضعیت اجرا", { exact: true })
        .selectOption("InProgress");
      await executionForm
        .getByRole("button", {
          name: "تاریخ واقعی حرکت/سوارشدن (شمسی)",
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ واقعی حرکت/سوارشدن (شمسی)",
        }),
        1404,
        "فروردین",
        "۲",
      );
      await executionForm
        .getByLabel("ساعت واقعی حرکت (تهران)", { exact: true })
        .selectOption("08");
      await executionForm
        .getByLabel("کیلومتر شروع", { exact: true })
        .fill("1234567890123456.78");
      await executionForm
        .getByRole("button", { name: "ذخیره اصلاحات اجرا" })
        .click();
      await expect(
        page.getByText("در حال اجرا", { exact: true }).first(),
      ).toBeVisible();

      await page
        .getByRole("link", { name: "خودرو و راننده", exact: true })
        .click();
      await expect(page.getByText(token).first()).toBeVisible();
      const voucherLink = page.getByRole("link", {
        name: "صدور قبض سفر",
        exact: true,
      });
      await voucherLink.click();
      await expect(page.getByRole("heading", { name: "قبض رسمی سفر" })).toBeVisible();
      await expect(page.getByText("امضای راننده", { exact: true })).toBeVisible();
      await expect(
        page.getByText("اطلاعات تکمیلی راننده — دست‌نویس", {
          exact: true,
        }),
      ).toBeVisible();
      await page.emulateMedia({ media: "print" });
      await expect(page.locator("[data-admin-chrome]").first()).toBeHidden();
      await expect(page.getByRole("button", { name: "چاپ قبض سفر" })).toBeHidden();
      await page.emulateMedia({ media: "screen" });

      await page
        .getByRole("link", { name: "بازگشت به پرونده سفر" })
        .click();
      await page
        .getByRole("link", { name: "نظرسنجی مسافران", exact: true })
        .click();
      const surveyForm = page.getByRole("form", {
        name: /ثبت نظرسنجی اجرای/,
      });
      await surveyForm.getByLabel("امتیاز مسافر").fill("5");
      await surveyForm.getByLabel("نظر مسافر").fill(`نظر ${token}`);
      await surveyForm.getByRole("button", { name: "ذخیره نظرسنجی" }).click();
      await expect(page.getByText("امتیاز 5", { exact: false })).toBeVisible();

      await page.goto(`/trips/requests?search=${encodeURIComponent(token)}`);
      await expect(page.getByText(/TR-1404-\d{4}/).first()).toBeVisible();
      await expect(page.getByText(`مبدأ ${token}`, { exact: true })).toBeVisible();
      await page.getByLabel("وضعیت درخواست").selectOption("InProgress");
      await expect(page).toHaveURL(/status=InProgress/);
      expect(
        await page.locator("main").evaluate((element) => {
          return element.scrollWidth <= element.clientWidth;
        }),
      ).toBe(true);
    },
  );
});
