import Image from "next/image";
import { notFound } from "next/navigation";
import { ActionLink } from "../../../components/ui/action-link/action-link";
import { PageShell } from "../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../components/ui/page-header/page-header";
import { DataTable } from "../../../components/ui/data-table/data-table";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../components/ui/record-cards/record-cards";
import { Pagination } from "../../../components/ui/pagination/pagination";
import { ResultState } from "../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../components/ui/technical-value/technical-value";
import { VehiclePlate } from "../../fleet/presentation/vehicles/list-vehicles/vehicle-plate";
import { makeReadDrivers } from "../composition/driver.factory";
import { assignmentState, licenseEligible, localDay } from "../application/assignment-rules";
import type { Assignment, License } from "../application/driver-records";
import { DriverForm } from "./driver-form";
import { DriverFormDialog } from "./driver-form-dialog";
import { DriverFilters } from "./driver-filters";
import styles from "./driver-pages.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
const single = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
const dayFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" });
const day = (d: Date | null) => d ? dayFormatter.format(d) : "ثبت نشده";
const timestamp = (d: Date | null) => d ? timeFormatter.format(d) : "باز";
const personBadge = (active: boolean) => <StatusBadge tone={active ? "positive" : "negative"} label={active ? "شخص فعال" : "شخص غیرفعال"} />;

export async function DriversPage({ searchParams }: { searchParams: SearchParams }) {
  const search = single(searchParams.search) ?? "";
  const requestedPage = Number(single(searchParams.page) ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1;
  const result = await makeReadDrivers().list(search, page);
  const link = (id: number) => <ActionLink href={`/drivers/${id}`} variant="quiet">پروندهٔ راننده</ActionLink>;
  return <PageShell><PageHeader eyebrow="مدیریت ناوگان" title="رانندگان" description="تعریف راننده، گواهینامه‌ها و سوابق تخصیص خودرو" action={<ActionLink href="/drivers/create" variant="primary">تعریف راننده</ActionLink>} />
    <DriverFilters search={search} />
    {!result.drivers.length ? <ResultState title="راننده‌ای پیدا نشد" description="جستجو را تغییر دهید یا برای یک شخص موجود راننده تعریف کنید." /> : <>
      <DataTable caption="رانندگان"><thead><tr><th>نام راننده</th><th>شمارهٔ پرسنلی</th><th>کد ملی</th><th>وضعیت شخص</th><th>عملیات</th></tr></thead><tbody>{result.drivers.map(d => <tr key={d.driverId}><td>{d.firstName} {d.lastName}</td><td><TechnicalValue>{d.personnelNo ?? "—"}</TechnicalValue></td><td><TechnicalValue>{d.nationalCode ?? "—"}</TechnicalValue></td><td>{personBadge(d.isActive)}</td><td>{link(d.driverId)}</td></tr>)}</tbody></DataTable>
      <RecordCardList>{result.drivers.map(d => <RecordCard key={d.driverId}><RecordCardHeader title={`${d.firstName} ${d.lastName}`} badge={personBadge(d.isActive)} /><RecordCardDetails><RecordCardDetail label="شمارهٔ پرسنلی"><TechnicalValue>{d.personnelNo ?? "—"}</TechnicalValue></RecordCardDetail><RecordCardDetail label="کد ملی"><TechnicalValue>{d.nationalCode ?? "—"}</TechnicalValue></RecordCardDetail></RecordCardDetails>{link(d.driverId)}</RecordCard>)}</RecordCardList>
    </>}
    <Pagination label="صفحه‌های رانندگان" currentPage={page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={next => { const query = new URLSearchParams(); for (const [key, value] of Object.entries(searchParams)) { if (value !== undefined) for (const item of Array.isArray(value) ? value : [value]) query.append(key, item); } query.set("page", String(next)); return `/drivers?${query}`; }} />
  </PageShell>;
}
export async function CreateDriverPage() {
  const people = await makeReadDrivers().availablePeople();
  return <PageShell width="narrow"><PageHeader eyebrow="رانندگان" title="تعریف راننده" description="راننده از روی پروندهٔ یک شخص فعال ساخته می‌شود؛ فقط اشخاصی که هنوز راننده نیستند در فهرست می‌آیند." action={<ActionLink href="/drivers">بازگشت به رانندگان</ActionLink>} />
    {people.length ? <DriverForm kind="driver" people={people} /> : <ResultState title="شخص واجد شرایطی موجود نیست" description="برای تعریف راننده، یک شخص فعال و بدون پروندهٔ رانندگی لازم است." />}
  </PageShell>;
}
function LicenseBadge({ license, now }: { license: License; now: Date }) {
  const eligible = licenseEligible(license, now);
  return <StatusBadge tone={eligible ? "positive" : "negative"} label={!license.isActive ? "غیرفعال" : eligible ? "فعال و معتبر" : license.expireDate && license.expireDate.toISOString().slice(0, 10) < localDay(now) ? "منقضی" : "هنوز صادر نشده"} />;
}
function AssignmentContent({ assignment: a, now, tone }: { assignment: Assignment; now: Date; tone: "current" | "history" }) {
  const state = assignmentState(a, now);
  return <article className={tone === "current" ? `${styles.assignment} ${styles.assignmentCurrent}` : styles.assignment} data-testid={`assignment-${a.assignmentId}`}>
    <div className={styles.assignmentHeader}>
      <h3>{a.vehicle.brandName} {a.vehicle.modelName}</h3>
      <StatusBadge label={state === "current" ? "تخصیص جاری" : state === "future" ? "برنامه‌ریزی‌شده" : "پایان‌یافته"} tone={state === "current" ? "positive" : "negative"} />
    </div>
    <div className={styles.assignmentMeta}>
      <VehiclePlate vehicle={a.vehicle} />
      <span>کد خودرو: <TechnicalValue>{a.vehicle.vehicleCode}</TechnicalValue></span>
    </div>
    <div className={styles.assignmentMeta}>
      <span>از {timestamp(a.fromDateTime)}</span>
      <span>{a.toDateTime === null ? "بدون زمان پایان" : `تا ${timestamp(a.toDateTime)}`}</span>
      <span>کیلومتر: <TechnicalValue>{a.startOdometer ?? "—"}</TechnicalValue> — <TechnicalValue>{a.endOdometer ?? "—"}</TechnicalValue></span>
    </div>
    {a.description && <p className={styles.assignmentNote}>{a.description}</p>}
    {a.toDateTime === null && <details className={styles.closeDisclosure}><summary>بستن تخصیص</summary><DriverForm kind="close" driverId={a.driverId} assignmentId={a.assignmentId} /></details>}
  </article>;
}
// Presentation-only placeholder: the same neutral portrait stands in for every
// driver because no photo field exists yet. It stays isolated here so a real
// Person/Driver photo can replace the source without touching the header.
function DriverAvatar() {
  return <div className={styles.avatar}>
    {/* Decorative: the driver's name sits right beside it. */}
    <Image src="/avatars/driver-placeholder.svg" alt="" width={96} height={96} className={styles.avatarImage} />
  </div>;
}
function primaryLicense(licenses: License[], now: Date): License | null {
  const eligible = licenses.filter(l => licenseEligible(l, now));
  if (!eligible.length) return null;
  return eligible.slice().sort((a, b) => (b.expireDate?.getTime() ?? Infinity) - (a.expireDate?.getTime() ?? Infinity))[0];
}
export async function DriverDetailsPage({ driverId }: { driverId: number }) {
  const reader = makeReadDrivers();
  const driver = await reader.details(driverId);
  if (!driver) notFound();
  const vehicles = await reader.availableVehicles();
  const now = new Date();
  const current = driver.assignments.filter(a => assignmentState(a, now) === "current");
  const history = driver.assignments.filter(a => assignmentState(a, now) !== "current");
  const license = primaryLicense(driver.licenses, now);
  const licenseDialogKey = driver.licenses.map(l => l.licenseId).join(",");
  const assignmentDialogKey = driver.assignments.map(a => a.assignmentId).join(",");
  return <PageShell>
    <PageHeader eyebrow="پروندهٔ راننده" title={`${driver.firstName} ${driver.lastName}`}
      avatar={<DriverAvatar />}
      action={<ActionLink href="/drivers">بازگشت به رانندگان</ActionLink>}
      description={<span className={styles.identityMeta}>
        <span className={styles.identityBadges}>
          {personBadge(driver.isActive)}
          <StatusBadge tone={license ? "positive" : "negative"} label={license ? "دارای گواهینامه معتبر" : "بدون گواهینامه معتبر"} />
        </span>
        <span className={styles.identityCodes}>
          <span>شمارهٔ پرسنلی: <TechnicalValue>{driver.personnelNo ?? "—"}</TechnicalValue></span>
          <span>کد ملی: <TechnicalValue>{driver.nationalCode ?? "—"}</TechnicalValue></span>
        </span>
      </span>} />
    <section id="licenses-section" className={styles.section} aria-label="گواهینامه‌ها">
      <div className={styles.sectionHeader}>
        <h2>گواهینامه‌ها</h2>
        <div className={styles.sectionHeaderActions}>
          {driver.licenses.length > 0 && <span className={styles.sectionCount}>{driver.licenses.length} مورد</span>}
          <DriverFormDialog key={licenseDialogKey} triggerLabel="افزودن گواهینامه" dialogTitle="ثبت گواهینامه" titleId="license-dialog-title">
            <DriverForm kind="license" driverId={driverId} />
          </DriverFormDialog>
        </div>
      </div>
      {!driver.licenses.length ? <ResultState title="گواهینامه‌ای ثبت نشده" description="پیش از تخصیص خودرو، گواهینامهٔ معتبر ثبت کنید." /> : <>
        <DataTable caption="گواهینامه‌ها"><thead><tr><th>نوع</th><th>شماره</th><th>صدور</th><th>انقضا</th><th>وضعیت</th></tr></thead><tbody>{driver.licenses.map(l => <tr key={l.licenseId}><td>{l.licenseType}</td><td><TechnicalValue>{l.licenseNo}</TechnicalValue></td><td>{day(l.issueDate)}</td><td>{day(l.expireDate)}</td><td><LicenseBadge license={l} now={now} /></td></tr>)}</tbody></DataTable>
        <RecordCardList>{driver.licenses.map(l => <RecordCard key={l.licenseId}><RecordCardHeader title={l.licenseType} badge={<LicenseBadge license={l} now={now} />} /><RecordCardDetails><RecordCardDetail label="شماره"><TechnicalValue>{l.licenseNo}</TechnicalValue></RecordCardDetail><RecordCardDetail label="صدور">{day(l.issueDate)}</RecordCardDetail><RecordCardDetail label="انقضا">{day(l.expireDate)}</RecordCardDetail></RecordCardDetails></RecordCard>)}</RecordCardList>
      </>}
    </section>
    <section id="assignment-section" className={styles.section} aria-label="تخصیص خودرو">
      <section className={styles.subsection} aria-label="تخصیص جاری">
        <div className={styles.sectionHeader}>
          <h2>تخصیص جاری</h2>
          <DriverFormDialog key={assignmentDialogKey} triggerLabel="تخصیص جدید" dialogTitle="ثبت تخصیص" titleId="assignment-dialog-title" size="list" disabled={!driver.licenses.length}>
            {!driver.isActive ? <ResultState title="شخص غیرفعال است" description="سوابق محفوظ است؛ تخصیص جدید برای شخص غیرفعال مجاز نیست." /> : !vehicles.length ? <ResultState title="خودروی فعالی موجود نیست" description="برای تخصیص، خودروی فعال لازم است." /> : <DriverForm kind="assignment" driverId={driverId} vehicles={vehicles} />}
          </DriverFormDialog>
        </div>
        {!driver.licenses.length && <p className={styles.sectionHint}>برای ثبت تخصیص، ابتدا باید یک گواهینامه برای راننده ثبت شود.</p>}
        {current.length ? current.map(a => <AssignmentContent key={a.assignmentId} assignment={a} now={now} tone="current" />) : <ResultState title="تخصیص جاری ندارد" description="تخصیص‌های پایان‌یافته یا آینده در سوابق نمایش داده می‌شوند." />}
      </section>
      <section className={styles.subsection} aria-label="تاریخچه و تخصیص‌های آینده">
        <div className={styles.sectionHeader}>
          <h2>تاریخچه و تخصیص‌های آینده</h2>
        </div>
        {history.length ? history.map(a => <AssignmentContent key={a.assignmentId} assignment={a} now={now} tone="history" />) : <ResultState title="سابقه‌ای موجود نیست" description="بازه‌های پایان‌یافته و برنامه‌ریزی‌شده اینجا باقی می‌مانند." />}
      </section>
    </section>
  </PageShell>;
}
