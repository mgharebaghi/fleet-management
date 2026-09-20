import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  connectToE2EDatabase,
  createPerson,
  type E2EDatabaseAdapter,
} from "./support/e2e-database";
import { selectJalaliDate } from "./support/jalali-calendar";
import { selectSearchableOption } from "./support/searchable-select";
import { gregorianToJalali } from "../src/components/ui/date-picker/jalali-date";

const REVIEW_MEDIA_DIR =
  "/cursor/stores/bc-a8ae88c9-ec40-4abd-9894-42d1ed2dc651/media";
const WIZARD_SCREENSHOTS = {
  desktop: `${REVIEW_MEDIA_DIR}/trip-create-wizard-desktop.png`,
  mobile: `${REVIEW_MEDIA_DIR}/trip-create-wizard-mobile.png`,
  review: `${REVIEW_MEDIA_DIR}/trip-create-wizard-review.png`,
  reviewMobile: `${REVIEW_MEDIA_DIR}/trip-create-wizard-review-mobile.png`,
};
const WORKSPACE_SCREENSHOTS = {
  listDesktop: `${REVIEW_MEDIA_DIR}/trip-workspace-list-desktop.png`,
  listMobile: `${REVIEW_MEDIA_DIR}/trip-workspace-list-mobile.png`,
  created: `${REVIEW_MEDIA_DIR}/trip-workspace-new.png`,
  planned: `${REVIEW_MEDIA_DIR}/trip-workspace-planned.png`,
  inProgress: `${REVIEW_MEDIA_DIR}/trip-workspace-inprogress.png`,
  completed: `${REVIEW_MEDIA_DIR}/trip-workspace-completed.png`,
  multiPassenger: `${REVIEW_MEDIA_DIR}/trip-workspace-multipassenger.png`,
  mobile: `${REVIEW_MEDIA_DIR}/trip-workspace-mobile.png`,
};

let adapter: E2EDatabaseAdapter;
let personId: number | undefined;
let originId: number | undefined;
let destinationId: number | undefined;
let inlineOriginId: number | undefined;
let inlineDestinationId: number | undefined;
let driverId: number | undefined;
let licenseId: number | undefined;
let brandId: number | undefined;
let modelId: number | undefined;
let statusId: number | undefined;
let vehicleId: number | undefined;
let assignmentId: number | undefined;
let requestId: number | undefined;
const token = randomUUID();
const inlineOriginName = `مبدأ اینلاین ${token}`;
const inlineDestinationName = `مقصد اینلاین ${token}`;
const tehranToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const currentJalaliYear = gregorianToJalali(tehranToday).year;
const currentGregorianYear = Number(tehranToday.slice(0, 4));
const fixtureStartDate = `${currentGregorianYear - 1}-01-01`;
const fixtureFutureEndDate = `${currentGregorianYear + 10}-01-01`;
const request = () => adapter.underlyingDriver().request();

async function tripRequestCountForFixturePerson() {
  if (personId === undefined) {
    throw new Error("E2E Person is missing.");
  }
  const result = await request()
    .input("personId", personId)
    .query<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM trip.TripRequest AS request
       WHERE EXISTS (
         SELECT 1
         FROM trip.Trip AS trip
         WHERE trip.TripRequestId = request.TripRequestId
           AND trip.PassengerPersonId = @personId
       )`,
    );
  return result.recordset[0].count;
}

async function saveWorkspaceScreenshot(
  page: Page,
  name: keyof typeof WORKSPACE_SCREENSHOTS,
) {
  await mkdir(REVIEW_MEDIA_DIR, { recursive: true });
  await page.screenshot({
    path: WORKSPACE_SCREENSHOTS[name],
    fullPage: true,
  });
}

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
}

async function createInlineLocation(
  page: Page,
  form: Locator,
  fieldLabel: string,
  locationName: string,
) {
  const trigger = form.getByLabel(fieldLabel, { exact: true });
  await trigger.click();
  const search = form.getByRole("dialog", { name: `جستجوی ${fieldLabel}` });
  await search.getByRole("combobox").fill(`بدون-تطابق-${token}`);
  await expect(search.getByText("مکانی پیدا نشد")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();

  await trigger
    .locator("xpath=ancestor::*[contains(@class, 'picker')]")
    .getByRole("button", { name: "+ ثبت مکان جدید" })
    .click();
  const dialog = page.getByRole("dialog", { name: "ثبت مکان جدید" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("نام مکان", { exact: true }).fill(locationName);
  await dialog.getByRole("button", { name: "ثبت و انتخاب مکان" }).click();
  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await expect(trigger).toContainText(locationName);
}

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
        .input("issueDate", fixtureStartDate)
        .input("expireDate", fixtureFutureEndDate)
        .query<{ id: number }>(
          `INSERT INTO driver.DriverLicense
             (DriverId, LicenseType, LicenseNo, IssueDate, ExpireDate, IsActive)
           OUTPUT INSERTED.DriverLicenseId AS id
             VALUES
               (@driver, N'آزمون سفر', @number, @issueDate, @expireDate, 1)`,
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
        .input("name", `E2E-TRIP-STATUS-${token.slice(0, 8)}`)
        .query<{ id: number }>(
          `INSERT INTO fleet.VehicleStatus (StatusName)
           OUTPUT INSERTED.VehicleStatusId AS id VALUES (@name)`,
        )
    ).recordset[0].id;
    vehicleId = (
      await request()
        .input("code", `E2E-TRIP-VEHICLE-${token.slice(0, 8)}`)
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
        .input("fromDateTime", fixtureStartDate)
        .input("toDateTime", fixtureFutureEndDate)
        .query<{ id: number }>(
          `INSERT INTO driver.VehicleDriverAssignment
             (DriverId, VehicleId, FromDateTime, ToDateTime)
           OUTPUT INSERTED.AssignmentId AS id
           VALUES (@driver, @vehicle, @fromDateTime, @toDateTime)`,
        )
    ).recordset[0].id;
  });

  test.afterAll(async () => {
    if (!adapter) return;
    try {
      if (requestId === undefined && personId !== undefined) {
        requestId = (
          await request()
            .input("personId", personId)
            .query<{ id: number }>(
              `SELECT TOP (1) TripRequestId AS id
               FROM trip.Trip
               WHERE PassengerPersonId=@personId
               ORDER BY TripRequestId DESC`,
            )
        ).recordset[0]?.id;
      }
      if (requestId !== undefined) {
        await request()
          .input("requestId", requestId)
          .query(`
            DELETE FROM driver.Accident WHERE TripRequestId=@requestId;
            DELETE FROM driver.VehicleViolation WHERE TripRequestId=@requestId;
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
      const locationIds = new Set(
        [originId, destinationId, inlineOriginId, inlineDestinationId].filter(
          (id): id is number => id !== undefined,
        ),
      );
      for (const id of locationIds) {
        await request()
          .input("id", id)
          .query("DELETE FROM common.Location WHERE LocationId=@id");
      }
      await request()
        .input("originName", inlineOriginName)
        .input("destinationName", inlineDestinationName)
        .query(
          `DELETE FROM common.Location
           WHERE LocationName IN (@originName, @destinationName)`,
        );
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
      page.setDefaultTimeout(60_000);
      page.setDefaultNavigationTimeout(120_000);
      const eventually = expect.configure({ timeout: 120_000 });
      await page.goto("/trips");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(
        page.getByRole("link", { name: /ثبت درخواست سفر/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /مشاهده سفرها/ }),
      ).toBeVisible();

      await page.getByRole("link", { name: /ثبت درخواست سفر/ }).click();
      await expect(page).toHaveURL(/\/trips\/create$/, { timeout: 60_000 });
      const form = page.locator('form[aria-label="ثبت درخواست سفر"]');
      const requestStep = form.getByRole("region", { name: "اطلاعات اصلی" });
      const passengersStep = form.getByRole("region", { name: "مسافران" });
      const requestStepNext = () =>
        requestStep.getByRole("button", { name: "بعدی", exact: true });
      await expect(form).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByRole("navigation", { name: "مراحل ثبت درخواست سفر" }),
      ).toBeVisible();
      await expect(
        requestStep.getByRole("heading", { name: "اطلاعات اصلی" }),
      ).toBeVisible();
      await eventually(requestStepNext()).toBeVisible();
      await eventually(
        requestStep.getByLabel("نوع درخواست سفر", { exact: true }),
      ).toBeVisible();

      await requestStep
        .getByLabel("نوع درخواست سفر", { exact: true })
        .selectOption({ label: "مبدأ مشترک - مقاصد مختلف" });
      await expect(
        requestStep.getByText(
          "یک مبدأ مشترک برای همهٔ مسافران؛ مقصد هر نفر جداگانه ثبت می‌شود.",
        ),
      ).toBeVisible();
      await expect(requestStep.getByLabel("مبدأ", { exact: true })).toBeVisible();

      await requestStep
        .getByLabel("نوع درخواست سفر", { exact: true })
        .selectOption({ label: "مبدأ و مقصد مشترک" });
      await expect(
        requestStep.getByText(
          "مبدأ و مقصد برای همهٔ مسافران یکسان است و در پروندهٔ هر مسافر تکرار می‌شود.",
        ),
      ).toBeVisible();
      await expect(requestStep.getByLabel("مبدأ", { exact: true })).toBeVisible();
      await expect(requestStep.getByLabel("مقصد", { exact: true })).toBeVisible();
      await requestStep
        .getByRole("button", {
          name: "تاریخ (شمسی)",
          exact: true,
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ (شمسی)",
        }),
        currentJalaliYear,
        "فروردین",
        "۱",
      );
      await requestStep
        .getByLabel("ساعت", { exact: true })
        .selectOption("08");

      const tooLongPurpose = "الف".repeat(501);
      await requestStep
        .getByLabel("هدف سفر", { exact: true })
        .fill(tooLongPurpose);
      await requestStepNext().click();
      await expect(
        requestStep.getByText("هدف سفر حداکثر ۵۰۰ نویسه است.").first(),
      ).toBeVisible();
      await expect(
        requestStep.getByLabel("هدف سفر", { exact: true }),
      ).toHaveValue(tooLongPurpose);
      await expect(
        requestStep.getByLabel("هدف سفر", { exact: true }),
      ).toHaveAttribute("aria-invalid", "true");
      expect(await tripRequestCountForFixturePerson()).toBe(0);

      await requestStep
        .getByLabel("هدف سفر", { exact: true })
        .fill(`هدف ${token}`);

      await mkdir(REVIEW_MEDIA_DIR, { recursive: true });
      await page.screenshot({
        path: WIZARD_SCREENSHOTS.desktop,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: WIZARD_SCREENSHOTS.mobile,
        fullPage: true,
      });
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(hasHorizontalOverflow).toBe(false);
      await page.setViewportSize({ width: 1280, height: 720 });

      await requestStepNext().click();
      await expect(
        form.getByRole("alert").filter({
          hasText: "مبدأ",
        }),
      ).toBeVisible();
      await expect(
        requestStep.getByRole("heading", { name: "اطلاعات اصلی" }),
      ).toBeVisible();

      await createInlineLocation(page, requestStep, "مبدأ", inlineOriginName);
      await createInlineLocation(page, requestStep, "مقصد", inlineDestinationName);
      await requestStepNext().click();
      await expect(
        passengersStep.getByRole("heading", { name: "مسافران" }),
      ).toBeVisible();
      await expect(passengersStep.getByLabel("مسافر", { exact: true })).toBeVisible();

      await passengersStep
        .getByRole("button", { name: "قبلی", exact: true })
        .click();
      await expect(
        requestStep.getByRole("heading", { name: "اطلاعات اصلی" }),
      ).toBeVisible();
      await expect(
        requestStep.getByLabel("هدف سفر", { exact: true }),
      ).toHaveValue(`هدف ${token}`);
      await expect(
        requestStep.getByLabel("نوع درخواست سفر", { exact: true }),
      ).toHaveValue(/.+/);
      await requestStepNext().click();

      await passengersStep
        .getByRole("button", { name: "+ افزودن مسافر", exact: true })
        .click();
      await expect(
        passengersStep.getByRole("article", { name: "اطلاعات مسافر 2" }),
      ).toBeVisible();
      await passengersStep.getByRole("button", { name: "حذف مسافر", exact: true }).click();
      await expect(
        passengersStep.getByRole("article", { name: "اطلاعات مسافر 2" }),
      ).toHaveCount(0);

      await selectSearchableOption(passengersStep, "مسافر", token, token);
      await passengersStep
        .getByRole("button", { name: "بعدی: راننده و خودرو", exact: true })
        .click();

      await eventually(
        page.getByRole("heading", { name: "راننده و خودرو" }),
      ).toBeVisible();
      await selectSearchableOption(
        page,
        "تخصیص واجد شرایط",
        token,
        token,
      );
      await eventually(
        page.getByText("آماده ثبت نهایی"),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "بعدی: مسیر سفر", exact: true })
        .click();

      await eventually(
        page.getByRole("heading", { name: "مسیر سفر (اختیاری)" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "بعدی: برنامه‌ریزی", exact: true })
        .click();

      await eventually(
        page.getByRole("heading", { name: "برنامه‌ریزی و برگه مأموریت" }),
      ).toBeVisible();
      await eventually(page.getByText("برنامه‌ریزی کامل")).toBeVisible();
      await page
        .getByRole("button", { name: "بعدی: مرور و تأیید نهایی", exact: true })
        .click();

      const reviewStep = page
        .getByRole("heading", { name: "مرور و تأیید نهایی" })
        .locator("xpath=ancestor::*[contains(@class, 'stepContainer')][1]");
      await eventually(
        reviewStep.getByRole("heading", { name: "مرور و تأیید نهایی" }),
      ).toBeVisible();
      await eventually(reviewStep.getByText("مبدأ و مقصد مشترک")).toBeVisible();
      await eventually(reviewStep.getByText(`مسافر ${token}`).first()).toBeVisible();
      await eventually(reviewStep.getByText(inlineOriginName)).toBeVisible();
      await eventually(reviewStep.getByText(inlineDestinationName)).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByRole("button", { name: "ثبت نهایی درخواست", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "قبلی: برنامه‌ریزی", exact: true }),
      ).toBeVisible();
      const reviewHasHorizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      expect(reviewHasHorizontalOverflow).toBe(false);
      await mkdir(REVIEW_MEDIA_DIR, { recursive: true });
      await page.screenshot({
        path: WIZARD_SCREENSHOTS.reviewMobile,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.screenshot({
        path: WIZARD_SCREENSHOTS.review,
        fullPage: true,
      });

      expect(await tripRequestCountForFixturePerson()).toBe(0);

      await page
        .getByRole("button", { name: "ثبت نهایی درخواست", exact: true })
        .click();

      await eventually(page).toHaveURL(/\/trips\/\d+$/);
      requestId = Number(page.url().split("/").pop());
      expect(await tripRequestCountForFixturePerson()).toBe(1);
      const createdLocations = await request()
        .input("requestId", requestId)
        .query<{ origin: number; destination: number }>(
          `SELECT OriginLocationId AS origin, DestinationLocationId AS destination
           FROM trip.Trip WHERE TripRequestId=@requestId`,
        );
      inlineOriginId = createdLocations.recordset[0]?.origin;
      inlineDestinationId = createdLocations.recordset[0]?.destination;
      await eventually(
        page.getByRole("heading", { name: new RegExp(`TR-${currentJalaliYear}-\\d{4}`) }),
      ).toBeVisible();
      await eventually(
        page.getByText("تخصیص‌یافته", { exact: true }).first(),
      ).toBeVisible();
      await eventually(
        page.getByRole("navigation", { name: "بخش‌های پرونده سفر" }),
      ).toBeVisible();
      await eventually(
        page.getByRole("link", { name: "جزئیات سفر", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await eventually(
        page.getByRole("heading", { name: "اطلاعات درخواست" }),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "created");
      await saveWorkspaceScreenshot(page, "multiPassenger");

      await page.goto(`/trips/${requestId}?tab=passengers`);
      await eventually(page.getByText(`مسافر ${token}`).first()).toBeVisible();
      await eventually(
        page.getByText(inlineOriginName, { exact: true }).first(),
      ).toBeVisible();
      await eventually(
        page.getByText(inlineDestinationName, { exact: true }).first(),
      ).toBeVisible();

      await page.goto(`/trips/${requestId}?tab=route`);
      await eventually(
        page.getByRole("button", { name: "ثبت مسیر برنامه‌ریزی‌شده" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "ثبت مسیر برنامه‌ریزی‌شده" })
        .click();
      const routeForm = page.getByRole("form", {
        name: "ثبت مسیر برنامه‌ریزی‌شده",
      });
      await eventually(routeForm).toBeVisible();
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
      await routeForm.getByRole("button", { name: "بعدی", exact: true }).click();
      await routeForm.getByRole("button", { name: "+ افزودن نقطه", exact: true }).click();
      await selectSearchableOption(routeForm, "مکان", token, `مبدأ ${token}`);
      await routeForm.getByRole("button", { name: "بعدی", exact: true }).click();
      await routeForm.getByRole("button", { name: "ذخیره مسیر", exact: true }).click();
      await eventually(
        page.getByText(`مسیر ${token}`, { exact: true }),
      ).toBeVisible();

      await page.goto(`/trips/${requestId}?tab=assignment`);
      await eventually(
        page.getByText(token).first(),
      ).toBeVisible();
      const voucherLink = page.getByRole("link", {
        name: "صدور برگه مأموریت",
        exact: true,
      });
      await eventually(voucherLink).toBeVisible();
      await voucherLink.click();
      await eventually(page).toHaveURL(/\/voucher\/\d+$/);
      await eventually(
        page.getByRole("heading", {
          name: "برگه مأموریت سفر — نسخه راننده",
        }),
      ).toBeVisible();
      await eventually(
        page.getByText("امضای راننده", { exact: true }),
      ).toBeVisible();
      await eventually(
        page.getByText("توقف‌ها — دست‌نویس", { exact: true }),
      ).toBeVisible();
      await page.emulateMedia({ media: "print" });
      await expect(page.locator("[data-admin-chrome]").first()).toBeHidden();
      await expect(page.getByRole("button", { name: "چاپ قبض سفر" })).toBeHidden();
      await page.emulateMedia({ media: "screen" });
      await page
        .getByRole("link", { name: "بازگشت به پرونده سفر" })
        .click();
      await eventually(page).toHaveURL(/\?tab=planning/);

      await page
        .getByRole("link", { name: "تخصیص‌یافته", exact: true })
        .click();
      await eventually(page).toHaveURL(/\?tab=completion/);
      await saveWorkspaceScreenshot(page, "planned");

      await page.getByRole("button", { name: "شروع سفر" }).click();
      await eventually(
        page.getByText("در حال اجرا", { exact: true }).first(),
      ).toBeVisible();
      await page.goto(`/trips/${requestId}?tab=completion`);
      await saveWorkspaceScreenshot(page, "inProgress");

      await page.getByRole("button", { name: "ثبت / ویرایش اطلاعات اجرای مسافران" }).click();
      const completionDialog = page.getByRole("dialog", {
        name: "ثبت / ویرایش اطلاعات اجرای مسافران",
      });
      await eventually(completionDialog).toBeVisible();
      const executionForm = completionDialog.getByRole("form", {
        name: "ثبت اطلاعات اجرای مسافر",
      });
      await eventually(executionForm).toBeVisible();
      await executionForm
        .getByRole("button", {
          name: "تاریخ واقعی سوارشدن",
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ واقعی سوارشدن",
        }),
        currentJalaliYear,
        "فروردین",
        "۲",
      );
      await executionForm
        .getByLabel("ساعت واقعی سوارشدن", { exact: true })
        .selectOption("08");

      await executionForm
        .getByRole("button", {
          name: "تاریخ واقعی پیاده‌شدن",
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ واقعی پیاده‌شدن",
        }),
        currentJalaliYear,
        "فروردین",
        "۲",
      );
      await executionForm
        .getByLabel("ساعت واقعی پیاده‌شدن", { exact: true })
        .selectOption("10");

      await executionForm
        .getByLabel("کیلومتر خودرو در شروع اجرا", { exact: true })
        .fill("1000");
      await executionForm
        .getByLabel("کیلومتر خودرو در پایان اجرا", { exact: true })
        .fill("1050");
      await executionForm
        .getByLabel("وضعیت اجرای مسافر", { exact: true })
        .selectOption("Completed");
      await executionForm
        .getByRole("button", { name: "ثبت و ذخیره اطلاعات" })
        .click();
      await eventually(page).toHaveURL(/\?tab=completion/);

      await page.getByRole("button", { name: "تکمیل سفر" }).click();
      await eventually(
        page.getByText("تکمیل‌شده", { exact: true }).first(),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "completed");

      await page.goto(`/trips/${requestId}?tab=completion`);
      await page.getByRole("button", { name: "ثبت نظرسنجی" }).click();
      const surveyDialog = page.getByRole("dialog", {
        name: "ثبت نظرسنجی مسافر",
      });
      await eventually(surveyDialog).toBeVisible();
      await surveyDialog.locator("label").filter({ hasText: "عالی" }).click();
      await surveyDialog
        .getByLabel("نظر یا بازخورد مسافر")
        .fill(`نظر ${token}`);
      await surveyDialog.getByRole("button", { name: "ثبت نظرسنجی" }).click();
      await eventually(surveyDialog).toBeHidden();
      await eventually(page.getByText(/امتیاز:\s*[۵5]\s*از\s*[۵5]/)).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoPageOverflow(page);
      await saveWorkspaceScreenshot(page, "mobile");
      await page.setViewportSize({ width: 1280, height: 720 });

      await page.goto(`/trips/requests?search=${encodeURIComponent(token)}`);
      await eventually(
        page.getByText(new RegExp(`TR-${currentJalaliYear}-\\d{4}`)).first(),
      ).toBeVisible();
      await eventually(
        page.getByText(inlineOriginName).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "مشاهده جزئیات" }).first(),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "listDesktop");
      await page.getByLabel("وضعیت درخواست").selectOption("Completed");
      await eventually(page).toHaveURL(/status=Completed/);
      await page.setViewportSize({ width: 390, height: 844 });
      await eventually(
        page.locator("main li").filter({ hasText: new RegExp(`TR-${currentJalaliYear}-\\d{4}`) }),
      ).toBeVisible();
      expect(
        await page.locator("main").evaluate((element) => {
          return element.scrollWidth <= element.clientWidth;
        }),
      ).toBe(true);
      await saveWorkspaceScreenshot(page, "listMobile");
    },
  );
});
