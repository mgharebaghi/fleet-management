import { notFound } from "next/navigation";

import { ActionLink } from "@/components/ui/action-link/action-link";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import { makeReadTrips } from "../composition/trip.factory";
import { persistedPlanningExecution } from "./trip-execution-current";
import { PrintTripVoucherButton } from "./print-trip-voucher-button";
import styles from "./trip-voucher.module.css";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  dateStyle: "long",
});
const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  dateStyle: "long",
  timeStyle: "short",
});

export async function TripVoucherPage({
  tripRequestId,
  tripId,
}: {
  tripRequestId: number;
  tripId: number;
}) {
  const reader = makeReadTrips();
  const details = await reader.details(tripRequestId);
  if (!details) notFound();
  const trip = details.passengers.find((candidate) => candidate.tripId === tripId);
  if (!trip) notFound();
  const execution = persistedPlanningExecution(trip.executions);
  const assignment = execution?.assignment;
  if (!assignment) notFound();
  const scheduledDateTime =
    trip.requestedPickupDateTime ?? details.requestedTravelDateTime;
  const route =
    trip.routes.find((candidate) => candidate.isSelected) ??
    trip.routes[0] ??
    execution?.routes.find((candidate) => candidate.isSelected) ??
    null;

  return (
    <main className={styles.page} lang="fa" dir="rtl">
      <div className={styles.screenActions}>
        <ActionLink
          href={`/trips/${tripRequestId}#planning`}
          variant="secondary"
        >
          بازگشت به پرونده سفر
        </ActionLink>
        <PrintTripVoucherButton />
      </div>

      <article className={styles.voucher} aria-labelledby="voucher-title">
        <div className={styles.officialHeader}>
          <div className={styles.organization}>
            <strong>سامانه مدیریت ناوگان</strong>
            <span>نسخه عملیاتی راننده</span>
          </div>
          <div className={styles.titleBlock}>
            <h1 id="voucher-title">برگه مأموریت سفر — نسخه راننده</h1>
            <p>جهت همراه داشتن راننده و تکمیل پس از مأموریت</p>
          </div>
          <div className={styles.issueMeta}>
            <span>تاریخ صدور</span>
            <strong>{dateFormatter.format(new Date())}</strong>
          </div>
        </div>

        <section className={styles.section}>
          <h2>مشخصات درخواست و سفر</h2>
          <dl className={styles.grid}>
            <div>
              <dt>شمارهٔ درخواست</dt>
              <dd>
                <TechnicalValue>{details.requestNo}</TechnicalValue>
              </dd>
            </div>
            <div>
              <dt>نوع درخواست</dt>
              <dd>{details.requestType.typeName}</dd>
            </div>
            <div>
              <dt>زمان برنامه‌ریزی‌شده</dt>
              <dd>{dateTimeFormatter.format(scheduledDateTime)}</dd>
            </div>
            <div>
              <dt>مسافر</dt>
              <dd>
                {trip.passenger.firstName} {trip.passenger.lastName}
              </dd>
            </div>
            <div>
              <dt>مبدأ</dt>
              <dd>{trip.origin.locationName}</dd>
            </div>
            <div>
              <dt>مقصد</dt>
              <dd>{trip.destination.locationName}</dd>
            </div>
            <div className={styles.full}>
              <dt>هدف سفر</dt>
              <dd>{details.purpose ?? "ثبت نشده"}</dd>
            </div>
            <div className={styles.full}>
              <dt>شرح درخواست / سفر</dt>
              <dd>
                {[details.description, trip.description]
                  .filter(Boolean)
                  .join(" — ") || "ثبت نشده"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2>راننده و خودرو</h2>
          <dl className={styles.grid}>
            <div>
              <dt>نام راننده</dt>
              <dd>
                {assignment.driverFirstName} {assignment.driverLastName}
              </dd>
            </div>
            <div>
              <dt>شمارهٔ پرسنلی راننده</dt>
              <dd>
                <TechnicalValue>
                  {assignment.driverPersonnelNo ?? "—"}
                </TechnicalValue>
              </dd>
            </div>
            <div>
              <dt>خودرو</dt>
              <dd>
                {assignment.vehicle.brandName} {assignment.vehicle.modelName}
              </dd>
            </div>
            <div>
              <dt>کد خودرو</dt>
              <dd>
                <TechnicalValue>
                  {assignment.vehicle.vehicleCode}
                </TechnicalValue>
              </dd>
            </div>
            <div className={styles.full}>
              <dt>پلاک</dt>
              <dd>
                <VehiclePlate vehicle={assignment.vehicle} />
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2>مسافر و مسیر</h2>
          <table className={styles.passengerTable}>
            <thead>
              <tr>
                <th>نام مسافر</th>
                <th>شمارهٔ پرسنلی</th>
                <th>مبدأ</th>
                <th>مقصد</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {trip.passenger.firstName} {trip.passenger.lastName}
                </td>
                <td>
                  <TechnicalValue>
                    {trip.passenger.personnelNo ?? "—"}
                  </TechnicalValue>
                </td>
                <td>{trip.origin.locationName}</td>
                <td>{trip.destination.locationName}</td>
              </tr>
            </tbody>
          </table>
          <dl className={styles.route}>
            <div>
              <dt>مسیر</dt>
              <dd>{route?.routeName ?? "مسیر ثبت نشده"}</dd>
            </div>
            <div>
              <dt>مسافت تخمینی</dt>
              <dd>{route?.distanceKm ? `${route.distanceKm} کیلومتر` : "—"}</dd>
            </div>
            <div>
              <dt>مدت تخمینی</dt>
              <dd>
                {route?.estimatedDurationMinute
                  ? `${route.estimatedDurationMinute} دقیقه`
                  : "—"}
              </dd>
            </div>
          </dl>
          {route && route.points.length > 0 && (
            <p className={styles.routeLine}>
              نقاط مسیر:{" "}
              {route.points
                .map((point) => point.location.locationName)
                .join(" ← ")}
            </p>
          )}
        </section>

        <section className={styles.section}>
          <h2>حرکت و بازگشت واقعی — دست‌نویس</h2>
          <div className={styles.handwritingGrid}>
            <div>
              <span>تاریخ و ساعت حرکت واقعی</span>
              <i />
            </div>
            <div>
              <span>تاریخ و ساعت بازگشت واقعی</span>
              <i />
            </div>
            <div>
              <span>کیلومتر شروع</span>
              <i />
            </div>
            <div>
              <span>کیلومتر پایان</span>
              <i />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>توقف‌ها — دست‌نویس</h2>
          <table className={styles.passengerTable}>
            <thead>
              <tr>
                <th>شروع</th>
                <th>پایان / مدت</th>
                <th>محل</th>
                <th>دلیل</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }, (_, index) => (
                <tr key={index}>
                  <td>
                    <i className={styles.blank} />
                  </td>
                  <td>
                    <i className={styles.blank} />
                  </td>
                  <td>
                    <i className={styles.blank} />
                  </td>
                  <td>
                    <i className={styles.blank} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>تأخیر و انحراف مسیر — دست‌نویس</h2>
          <p className={styles.checks}>
            تأخیر: ☐ رخ نداده ☐ رخ داده — شرح: <i className={styles.blankLine} />
          </p>
          <p className={styles.checks}>
            انحراف مسیر: ☐ رخ نداده ☐ رخ داده — شرح:{" "}
            <i className={styles.blankLine} />
          </p>
        </section>

        <section className={styles.section}>
          <h2>اعلام رخداد — دست‌نویس</h2>
          <p className={styles.checks}>
            ☐ هیچ ☐ تصادف ☐ تخلف/جریمه ☐ خرابی ☐ سایر
          </p>
        </section>

        <section className={styles.section}>
          <h2>جزئیات تصادف — دست‌نویس</h2>
          <div className={styles.handwritingGrid}>
            <div>
              <span>تاریخ و ساعت</span>
              <i />
            </div>
            <div>
              <span>محل</span>
              <i />
            </div>
            <div>
              <span>جراحت ☐ بله ☐ خیر</span>
              <i />
            </div>
            <div>
              <span>شماره گزارش پلیس</span>
              <i />
            </div>
            <div className={styles.notes}>
              <span>شرح، خسارت و درصد تقصیر</span>
              <i />
              <i />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>جزئیات تخلف — دست‌نویس</h2>
          <div className={styles.handwritingGrid}>
            <div>
              <span>تاریخ و ساعت</span>
              <i />
            </div>
            <div>
              <span>محل</span>
              <i />
            </div>
            <div>
              <span>نوع تخلف</span>
              <i />
            </div>
            <div>
              <span>شماره پیگیری</span>
              <i />
            </div>
            <div>
              <span>مبلغ در صورت مشخص بودن</span>
              <i />
            </div>
            <div>
              <span>توضیحات</span>
              <i />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>سایر یادداشت‌های عملیاتی — دست‌نویس</h2>
          <div className={styles.handwritingGrid}>
            <div className={styles.notes}>
              <span>مسیر، خودرو یا عملیات</span>
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        <section className={styles.signatures} aria-label="امضاها و مهر">
          <div>
            <strong>امضای راننده</strong>
            <span>نام، امضا و تاریخ</span>
          </div>
          <div>
            <strong>صادرکننده</strong>
            <span>نام، امضا و تاریخ</span>
          </div>
          <div>
            <strong>تحویل‌گیرنده / تأییدکننده</strong>
            <span>نام، امضا و تاریخ عودت</span>
          </div>
          <div>
            <strong>محل مهر</strong>
            <span>مهر واحد مربوطه</span>
          </div>
        </section>

        <footer className={styles.footer}>
          این برگه پس از تکمیل و امضا به واحد عملیات تحویل و اطلاعات واقعی آن
          در پروندهٔ الکترونیکی سفر ثبت می‌شود. خانه‌های دست‌نویس در سامانه
          ذخیره نمی‌شوند.
        </footer>
      </article>
    </main>
  );
}
