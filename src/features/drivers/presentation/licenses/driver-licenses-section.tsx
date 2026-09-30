import { DataTable } from "../../../../components/ui/data-table/data-table";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../components/ui/record-cards/record-cards";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { StatusTimeline } from "../../../../components/ui/status-timeline/status-timeline";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { IconActionGroup } from "../../../../components/ui/icon-action-button/icon-action-button";
import { licenseEligible, localDay } from "../../application/assignment-rules";
import type { License } from "../../application/driver-records";
import { DriverForm } from "../driver-form";
import { DriverFormDialog } from "../driver-form-dialog";
import { DeleteLicenseButton } from "./delete-license-dialog";
import { getLicenseExpiryStatus } from "./license-status";
import styles from "../driver-pages.module.css";
import type { DriverDetails } from "../../application/driver-records";
const dayFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", dateStyle: "medium" });
const day = (d: Date | null) => d ? dayFormatter.format(d) : "ثبت نشده";
const inputDay = (d: Date | null) => d?.toISOString().slice(0, 10) ?? "";
function LicenseBadge({ license, now }: { license: License; now: Date }) {
  const eligible = licenseEligible(license, now);
  return <StatusBadge tone={eligible ? "positive" : "negative"} label={!license.isActive ? "غیرفعال" : eligible ? "فعال و معتبر" : license.expireDate && license.expireDate.toISOString().slice(0, 10) < localDay(now) ? "منقضی" : "هنوز صادر نشده"} />;
}

export function DriverLicensesSection({driver, now}: {driver: DriverDetails; now: Date}) {
  const driverId = driver.driverId;
  const licenseDialogKey = driver.licenses.map(l => l.licenseId).join(",");
  return <section aria-label="گواهینامه‌ها">
      <div className={styles.sectionHeader}>
        <h2>گواهینامه‌ها</h2>
        <div className={styles.sectionHeaderActions}>
          <DriverFormDialog key={licenseDialogKey} triggerLabel="افزودن گواهینامه" dialogTitle="ثبت گواهینامه" titleId="license-dialog-title">
            <DriverForm kind="license" driverId={driverId} />
          </DriverFormDialog>
        </div>
      </div>
      {!driver.licenses.length ? <p className={styles.emptyLine}>گواهینامه‌ای ثبت نشده. پیش از تخصیص خودرو، گواهینامهٔ معتبر اضافه کنید.</p> : <>
        <DataTable caption="گواهینامه‌ها"><thead><tr><th>نوع</th><th>شماره</th><th>دوره اعتبار</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{driver.licenses.map(l => { const expiry = getLicenseExpiryStatus(l, now); return <tr key={l.licenseId}><td>{l.licenseType}</td><td><TechnicalValue>{l.licenseNo}</TechnicalValue></td><td><StatusTimeline tone={expiry.tone} statusLabel={expiry.label} startLabel={`صدور ${day(l.issueDate)}`} endLabel={`انقضا ${day(l.expireDate)}`} progress={expiry.progress} /></td><td><LicenseBadge license={l} now={now} /></td><td><IconActionGroup><DriverFormDialog iconTrigger triggerLabel={`ویرایش گواهینامه ${l.licenseType}`} dialogTitle="ویرایش گواهینامه" titleId={`edit-license-${l.licenseId}-title`}><DriverForm kind="editLicense" driverId={driverId} licenseId={l.licenseId} initialValues={{ licenseType: l.licenseType, licenseNo: l.licenseNo, issueDate: inputDay(l.issueDate), expireDate: inputDay(l.expireDate), isActive: String(l.isActive) }} /></DriverFormDialog><DeleteLicenseButton driverId={driverId} licenseId={l.licenseId} licenseType={l.licenseType} licenseNo={l.licenseNo} /></IconActionGroup></td></tr>; })}</tbody></DataTable>
        <RecordCardList>{driver.licenses.map(l => { const expiry = getLicenseExpiryStatus(l, now); return <RecordCard key={l.licenseId}><RecordCardHeader title={l.licenseType} badge={<LicenseBadge license={l} now={now} />} /><RecordCardDetails><RecordCardDetail label="شماره"><TechnicalValue>{l.licenseNo}</TechnicalValue></RecordCardDetail><RecordCardDetail label="دوره اعتبار"><StatusTimeline tone={expiry.tone} statusLabel={expiry.label} startLabel={`صدور ${day(l.issueDate)}`} endLabel={`انقضا ${day(l.expireDate)}`} progress={expiry.progress} /></RecordCardDetail></RecordCardDetails><IconActionGroup><DriverFormDialog iconTrigger triggerLabel={`ویرایش گواهینامه ${l.licenseType}`} dialogTitle="ویرایش گواهینامه" titleId={`edit-license-card-${l.licenseId}-title`}><DriverForm kind="editLicense" driverId={driverId} licenseId={l.licenseId} initialValues={{ licenseType: l.licenseType, licenseNo: l.licenseNo, issueDate: inputDay(l.issueDate), expireDate: inputDay(l.expireDate), isActive: String(l.isActive) }} /></DriverFormDialog><DeleteLicenseButton driverId={driverId} licenseId={l.licenseId} licenseType={l.licenseType} licenseNo={l.licenseNo} /></IconActionGroup></RecordCard>; })}</RecordCardList>
      </>}
    </section>;
}
