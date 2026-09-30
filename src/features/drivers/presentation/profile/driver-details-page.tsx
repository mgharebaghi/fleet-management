import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { makeReadDrivers } from "../../composition/driver.factory";
import { assignmentState, licenseEligible } from "../../application/assignment-rules";
import type { License } from "../../application/driver-records";
import { DriverRecordTabs, driverRecordTabHref, type DriverRecordTab } from "../driver-record-tabs";
import { DriverForm } from "../driver-form";
import { DriverFormDialog } from "../driver-form-dialog";
import styles from "../driver-pages.module.css";
import { AssignmentContent } from "../assignment/assignment-content";
import { DriverLicensesSection } from "../licenses/driver-licenses-section";

const personBadge = (active: boolean) => <StatusBadge tone={active ? "positive" : "negative"} label={active ? "شخص فعال" : "شخص غیرفعال"} />;

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

function selectedDriverTab(tab: string | undefined): DriverRecordTab {
  if (tab === "assignments" || tab === "history") return tab;
  return "licenses";
}

export async function DriverDetailsPage({ driverId, tab }: { driverId: number; tab?: string }) {
  const reader = makeReadDrivers();
  const driver = await reader.details(driverId);
  if (!driver) notFound();
  const vehicles = await reader.availableVehicles();
  const now = new Date();
  const currentAssignments = await reader.currentVehicleAssignments(now);
  const current = driver.assignments.filter(a => assignmentState(a, now) === "current");
  const future = driver.assignments.filter(a => assignmentState(a, now) === "future");
  const history = driver.assignments.filter(a => assignmentState(a, now) === "past");
  const license = primaryLicense(driver.licenses, now);
  const assignmentDialogKey = driver.assignments.map(a => a.assignmentId).join(",");
  const activeTab = selectedDriverTab(tab);
  const canAssign = driver.isActive && license !== null && vehicles.length > 0;
  const assignBlocked = !driver.isActive
    ? "شخص غیرفعال است. سوابق محفوظ می‌ماند و تخصیص جدید مجاز نیست."
    : !license
      ? driver.licenses.length
        ? "گواهینامهٔ معتبری برای امروز وجود ندارد، بنابراین تخصیص جدید غیرفعال است."
        : "گواهینامهٔ معتبری ثبت نشده است. تا وقتی گواهینامهٔ فعال و معتبر نباشد، تخصیص خودرو غیرفعال است."
      : !vehicles.length
        ? "خودروی فعالی برای تخصیص موجود نیست."
        : null;
  return <PageShell>
    <header className={styles.pageHead}>
      <div>
        <p className={styles.pageKicker}>پروندهٔ راننده</p>
        <h1>{driver.firstName} {driver.lastName}</h1>
        <p className={styles.pageSubtitle}>شمارهٔ پرسنلی <TechnicalValue>{driver.personnelNo ?? "—"}</TechnicalValue></p>
      </div>
      <Link className={styles.backLink} href="/drivers">بازگشت به رانندگان</Link>
    </header>
    <section className={styles.identityCard}>
      <DriverAvatar />
      <div className={styles.identityCopy}>
        <h2>{driver.firstName} {driver.lastName}</h2>
        <p>شمارهٔ پرسنلی <TechnicalValue>{driver.personnelNo ?? "—"}</TechnicalValue></p>
        <p>کد ملی <TechnicalValue>{driver.nationalCode ?? "—"}</TechnicalValue></p>
      </div>
      <div className={styles.identityBadges}>
        {personBadge(driver.isActive)}
        <StatusBadge tone={license ? "positive" : "negative"} label={license ? "دارای گواهینامه معتبر" : "بدون گواهینامه معتبر"} />
      </div>
    </section>
    <div className={styles.workspaceBody}>
    <div className={styles.recordCard}>
    <DriverRecordTabs driverId={driverId} active={activeTab} counts={{ licenses: driver.licenses.length, assignments: current.length + future.length, history: history.length }}>
    <div className={styles.tabPanel} role="tabpanel" id={`driver-panel-${activeTab}`} aria-labelledby={`driver-tab-${activeTab}`}>
    {activeTab === "licenses" && <DriverLicensesSection driver={driver} now={now} />}
    {activeTab === "assignments" && <section aria-label="تخصیص خودرو">
      {current.length > 0 && <div className={styles.recordGroup}><h3>تخصیص جاری</h3>{current.map(a => <AssignmentContent key={a.assignmentId} assignment={a} now={now} state="current" vehicles={vehicles} currentAssignments={currentAssignments} />)}</div>}
      {future.length > 0 && <div className={styles.recordGroup}><h3>تخصیص‌های آینده</h3>{future.map(a => <AssignmentContent key={a.assignmentId} assignment={a} now={now} state="future" vehicles={vehicles} currentAssignments={currentAssignments} />)}</div>}
      {current.length === 0 && future.length === 0 && <p className={styles.emptyLine}>تخصیص جاری یا آینده‌ای ثبت نشده است.</p>}
    </section>}
    {activeTab === "history" && <section aria-label="سوابق تخصیص">
      {history.length ? history.map(a => <AssignmentContent key={a.assignmentId} assignment={a} now={now} state="past" vehicles={vehicles} currentAssignments={currentAssignments} />) : <p className={styles.emptyLine}>تخصیص پایان‌یافته‌ای ثبت نشده است.</p>}
    </section>}
    </div>
    </DriverRecordTabs>
    </div>
    <aside className={styles.sideColumn} aria-label="اقدام بعدی">
      <section className={styles.nextPanel}>
        <h2>اقدام بعدی</h2>
        <p className={assignBlocked ? styles.warningNote : styles.infoNote}>
          {current.length ? "این راننده همین الان خودرو دارد." : "تخصیص جاری ثبت نشده است."}
          {assignBlocked ? ` ${assignBlocked}` : " می‌توانید خودرو را به این راننده تخصیص دهید."}
        </p>
        {!license && activeTab !== "licenses" && <Link className={styles.backLink} href={driverRecordTabHref(driverId, "licenses")}>گواهینامه‌ها</Link>}
        {canAssign && <DriverFormDialog key={assignmentDialogKey} triggerLabel="تخصیص خودرو به راننده" dialogTitle="تخصیص خودرو به راننده" titleId="assignment-dialog-title" size="list">
          <DriverForm kind="assignment" driverId={driverId} vehicles={vehicles} currentAssignments={currentAssignments} />
        </DriverFormDialog>}
      </section>
    </aside>
    </div>
  </PageShell>;
}
