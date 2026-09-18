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
    .locator("xpath=../..")
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
      const openSection = async (name: string) => {
        await page
          .getByRole("navigation", { name: "بخش‌های پرونده سفر" })
          .getByRole("link", { name, exact: true })
          .click();
      };
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
      const form = page.getByRole("form", { name: "ثبت درخواست سفر" });
      await expect(form).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByRole("navigation", { name: "مراحل ثبت درخواست سفر" }),
      ).toBeVisible();
      await expect(
        form.getByRole("heading", { name: "اطلاعات درخواست" }),
      ).toBeVisible();
      await expect(
        form.getByRole("heading", { name: "مسافران" }),
      ).toBeHidden();
      await expect(
        form.getByRole("button", { name: "بعدی", exact: true }),
      ).toBeVisible();
      await expect(
        form.getByRole("button", { name: "مرور و ثبت", exact: true }),
      ).toBeHidden();

      await form
        .getByLabel("نوع درخواست", { exact: true })
        .selectOption({ label: "مبدأ مشترک - مقاصد مختلف" });
      await expect(
        form.getByText(
          "یک مبدأ مشترک برای همهٔ مسافران؛ مقصد هر نفر جداگانه ثبت می‌شود.",
        ),
      ).toBeVisible();
      await expect(form.getByLabel("مبدأ مشترک", { exact: true })).toBeVisible();
      await expect(form.getByLabel("مقصد مشترک", { exact: true })).toHaveCount(0);

      await form
        .getByLabel("نوع درخواست", { exact: true })
        .selectOption({ label: "مبدأ و مقصد مشترک" });
      await expect(
        form.getByText(
          "مبدأ و مقصد برای همهٔ مسافران یکسان است و در پروندهٔ هر مسافر تکرار می‌شود.",
        ),
      ).toBeVisible();
      await expect(form.getByLabel("مبدأ مشترک", { exact: true })).toBeVisible();
      await expect(form.getByLabel("مقصد مشترک", { exact: true })).toBeVisible();
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
        .getByLabel("ساعت ثبت", { exact: true })
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
        .getByLabel("ساعت برنامه‌ریزی‌شده", { exact: true })
        .selectOption("08");
      const tooLongPurpose = "پ".repeat(501);
      await form
        .getByLabel("هدف سفر (اختیاری)", { exact: true })
        .fill(tooLongPurpose);

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

      await form.getByRole("button", { name: "بعدی", exact: true }).click();
      await expect(
        form.getByRole("alert").filter({
          hasText: "مبدأ مشترک",
        }),
      ).toBeVisible();
      await expect(
        form.getByRole("heading", { name: "اطلاعات درخواست" }),
      ).toBeVisible();

      await createInlineLocation(page, form, "مبدأ مشترک", inlineOriginName);
      await createInlineLocation(
        page,
        form,
        "مقصد مشترک",
        inlineDestinationName,
      );
      await form.getByRole("button", { name: "بعدی", exact: true }).click();
      await expect(
        form.getByRole("heading", { name: "مسافران" }),
      ).toBeVisible();
      await expect(
        form.getByRole("heading", { name: "اطلاعات درخواست" }),
      ).toBeHidden();
      await expect(form.getByLabel("مسافر", { exact: true })).toBeVisible();
      await expect(form.getByLabel("مبدأ", { exact: true })).toHaveCount(0);
      await expect(form.getByLabel("مقصد", { exact: true })).toHaveCount(0);

      await form.getByRole("button", { name: "قبلی", exact: true }).click();
      await expect(
        form.getByRole("heading", { name: "اطلاعات درخواست" }),
      ).toBeVisible();
      await expect(
        form.getByLabel("هدف سفر (اختیاری)", { exact: true }),
      ).toHaveValue(tooLongPurpose);
      await expect(
        form.getByLabel("نوع درخواست", { exact: true }),
      ).toHaveValue(/.+/);
      await form.getByRole("button", { name: "بعدی", exact: true }).click();

      await form
        .getByRole("button", { name: "افزودن مسافر", exact: true })
        .click();
      await expect(form.getByRole("heading", { name: "مسافر 2" })).toBeVisible();
      await form.getByRole("button", { name: "حذف", exact: true }).click();
      await expect(form.getByRole("heading", { name: "مسافر 2" })).toHaveCount(0);

      await selectSearchableOption(form, "مسافر", token, token);
      await form
        .getByRole("button", { name: "مرور و ثبت", exact: true })
        .click();
      const review = page.getByRole("dialog", {
        name: "مرور و تأیید درخواست",
      });
      await expect(review).toBeVisible();
      await expect(review.getByText("مبدأ و مقصد مشترک")).toBeVisible();
      await expect(review.getByText(`مسافر ${token}`)).toBeVisible();
      await expect(review.getByText(inlineOriginName).first()).toBeVisible();
      await expect(review.getByText(inlineDestinationName).first()).toBeVisible();
      const reviewText = await review.innerText();
      expect(reviewText).not.toMatch(
        new RegExp(`(?:^|\\D)${Number(personId)}(?:\\D|$)`),
      );

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        review.getByRole("button", { name: "تأیید و ثبت درخواست", exact: true }),
      ).toBeVisible();
      await expect(
        review.getByRole("button", { name: "بازگشت و ویرایش", exact: true }),
      ).toBeVisible();
      await expect(review.getByText("مبدأ و مقصد مشترک")).toBeVisible();
      await expect(review.getByText(`مسافر ${token}`)).toBeVisible();
      const reviewHasHorizontalOverflow = await review.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 1,
      );
      expect(reviewHasHorizontalOverflow).toBe(false);
      const pageHasHorizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      expect(pageHasHorizontalOverflow).toBe(false);
      await mkdir(REVIEW_MEDIA_DIR, { recursive: true });
      await review.screenshot({
        path: WIZARD_SCREENSHOTS.reviewMobile,
      });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.screenshot({
        path: WIZARD_SCREENSHOTS.review,
        fullPage: true,
      });

      expect(await tripRequestCountForFixturePerson()).toBe(0);

      await review
        .getByRole("button", { name: "تأیید و ثبت درخواست", exact: true })
        .click();
      await expect(page).toHaveURL(/\/trips\/create$/);
      await expect(
        form.getByRole("alert").filter({
          hasText: "هدف سفر حداکثر ۵۰۰ نویسه است.",
        }).first(),
      ).toBeVisible();
      await expect(
        form.getByRole("heading", { name: "اطلاعات درخواست" }),
      ).toBeVisible();
      await expect(
        form.getByLabel("هدف سفر (اختیاری)", { exact: true }),
      ).toHaveValue(tooLongPurpose);
      await expect(
        form.getByLabel("هدف سفر (اختیاری)", { exact: true }),
      ).toHaveAttribute("aria-invalid", "true");
      await expect(
        form.getByLabel("نوع درخواست", { exact: true }),
      ).toHaveValue(/.+/);
      expect(await tripRequestCountForFixturePerson()).toBe(0);
      await form
        .getByLabel("هدف سفر (اختیاری)", { exact: true })
        .fill(`هدف ${token}`);
      await form.getByRole("button", { name: "بعدی", exact: true }).click();
      await expect(
        form.getByRole("heading", { name: "مسافران" }),
      ).toBeVisible();
      await form
        .getByRole("button", { name: "مرور و ثبت", exact: true })
        .click();
      await expect(review).toBeVisible();
      await expect(review.getByText(`هدف ${token}`)).toBeVisible();
      await review
        .getByRole("button", { name: "تأیید و ثبت درخواست", exact: true })
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
      await expect(
        page.getByRole("heading", { name: /سفر TR-1404-\d{4}/ }),
      ).toBeVisible();
      await expect(
        page.getByText("جدید", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "مراحل انجام سفر" }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "بخش‌های پرونده سفر" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "اقدام بعدی" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "ثبت خودرو و راننده" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "لغو درخواست" }),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "created");
      await saveWorkspaceScreenshot(page, "multiPassenger");

      await page.goto(`/trips/${requestId}?tab=passengers`);
      await eventually(
        page.getByRole("heading", { name: "جزئیات سفر و مسافران" }),
      ).toBeVisible();
      await eventually(page.getByText(`مسافر ${token}`).first()).toBeVisible();
      await eventually(
        page.getByText(inlineOriginName, { exact: true }).first(),
      ).toBeVisible();
      await eventually(
        page.getByText(inlineDestinationName, { exact: true }).first(),
      ).toBeVisible();

      await page.goto(`/trips/${requestId}?tab=route`);
      await eventually(
        page.getByRole("heading", { name: "برنامه‌ریزی سفر" }),
      ).toBeVisible();
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
      await selectSearchableOption(routeForm, "مکان", token, `مبدأ ${token}`);
      await routeForm.getByRole("button", { name: "ثبت مسیر" }).click();
      await eventually(
        page.getByText(`مسیر ${token}`, { exact: true }),
      ).toBeVisible();
      await eventually(page.getByText("مسیر: ثبت شده")).toBeVisible();

      await openSection("برنامه‌ریزی سفر");
      await page.getByRole("button", { name: "ثبت خودرو و راننده" }).click();
      const planningForm = page.getByRole("form", {
        name: "ثبت برنامهٔ اجرا",
      });
      await eventually(planningForm).toBeVisible();
      await selectSearchableOption(
        planningForm,
        "تخصیص خودرو و راننده",
        token,
        token,
      );
      await planningForm
        .getByRole("button", { name: "ثبت برنامهٔ اجرا" })
        .click();
      await eventually(
        page.getByText("تخصیص ثبت‌شده", { exact: true }).first(),
      ).toBeVisible();
      await eventually(
        page.getByRole("button", { name: "ثبت تخصیص‌یافته" }),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "planned");

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
      await eventually(page).toHaveURL(/#planning/);

      await page.getByRole("button", { name: "ثبت تخصیص‌یافته" }).click();
      await eventually(
        page.getByText("تخصیص‌یافته", { exact: true }).first(),
      ).toBeVisible();
      await eventually(
        page.getByRole("button", { name: "ثبت زمان حرکت" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "ثبت زمان حرکت" }).click();
      const executionForm = page.getByRole("form", {
        name: "اصلاح اجرای سفر",
      });
      await eventually(executionForm).toBeVisible();
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
        .getByLabel("ساعت واقعی حرکت", { exact: true })
        .selectOption("08");
      await executionForm
        .getByLabel("کیلومتر شروع (اختیاری)", { exact: true })
        .fill("1234567890123456.78");
      await executionForm
        .getByRole("button", { name: "شروع اجرا" })
        .click();
      await eventually(
        page.getByText("در حال اجرا", { exact: true }).first(),
      ).toBeVisible();

      await page.getByRole("button", { name: "شروع درخواست" }).click();
      await eventually(
        page.getByRole("button", { name: "ثبت بازگشت" }),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "inProgress");

      await openSection("اجرای سفر");
      const completeForm = page.getByRole("form", {
        name: "اصلاح اجرای سفر",
      });
      await eventually(completeForm).toBeVisible();
      await completeForm
        .getByRole("button", {
          name: "تاریخ واقعی بازگشت/پیاده‌شدن (شمسی)",
        })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", {
          name: "انتخاب تاریخ واقعی بازگشت/پیاده‌شدن (شمسی)",
        }),
        1404,
        "فروردین",
        "۲",
      );
      await completeForm
        .getByLabel("ساعت واقعی بازگشت", { exact: true })
        .selectOption("10");
      await completeForm
        .getByRole("button", { name: "تکمیل اجرا" })
        .click();
      await eventually(
        page.getByText("تکمیل‌شده", { exact: true }).first(),
      ).toBeVisible();

      await openSection("بازگشت و تکمیل");
      await page.getByText("ثبت تصادف یا تخلف").click();
      const accidentForm = page.getByRole("form", {
        name: "ثبت تصادف برگشتی",
      });
      await eventually(accidentForm).toBeVisible();
      await accidentForm
        .getByRole("button", { name: "تاریخ تصادف (شمسی)" })
        .click();
      await selectJalaliDate(
        page.getByRole("dialog", { name: "انتخاب تاریخ تصادف (شمسی)" }),
        1404,
        "فروردین",
        "۲",
      );
      await accidentForm
        .getByLabel("ساعت تصادف", { exact: true })
        .selectOption("09");
      await accidentForm.getByLabel("جراحت").selectOption("false");
      await accidentForm.getByRole("button", { name: "ثبت تصادف" }).click();
      await eventually(page).toHaveURL(/#return/);
      const accidents = await request()
        .input("requestId", requestId)
        .query<{ count: number }>(
          "SELECT COUNT(*) AS count FROM driver.Accident WHERE TripRequestId=@requestId",
        );
      expect(accidents.recordset[0].count).toBe(1);

      await page.getByRole("button", { name: "تکمیل درخواست" }).click();
      await eventually(
        page.getByRole("button", { name: "مشاهده جزئیات سفر" }),
      ).toBeVisible();
      await saveWorkspaceScreenshot(page, "completed");

      await page.goto(`/trips/${requestId}?tab=survey`);
      const surveyForm = page.getByRole("form", {
        name: "ثبت نظرسنجی مسافر",
      });
      await eventually(surveyForm).toBeVisible();
      await surveyForm.getByLabel("امتیاز مسافر").fill("5");
      await surveyForm.getByLabel("نظر مسافر").fill(`نظر ${token}`);
      await surveyForm.getByRole("button", { name: "ذخیره نظرسنجی" }).click();
      await eventually(page).toHaveURL(/#return/);
      await eventually(page.getByText(/امتیاز:\s*5/)).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await expectNoPageOverflow(page);
      await saveWorkspaceScreenshot(page, "mobile");
      await page.setViewportSize({ width: 1280, height: 720 });

      await page.goto(`/trips/requests?search=${encodeURIComponent(token)}`);
      await eventually(page.getByText(/TR-1404-\d{4}/).first()).toBeVisible();
      await eventually(
        page.locator("table").getByText(inlineOriginName),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "مشاهده جزئیات سفر" }).first(),
      ).toBeVisible();
      await eventually(page.getByText("بازگشت و تکمیل").first()).toBeVisible();
      await saveWorkspaceScreenshot(page, "listDesktop");
      await page.getByLabel("وضعیت درخواست").selectOption("Completed");
      await eventually(page).toHaveURL(/status=Completed/);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator("table")).toBeHidden();
      await expect(
        page.locator("main li").filter({ hasText: /TR-1404-\d{4}/ }),
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
