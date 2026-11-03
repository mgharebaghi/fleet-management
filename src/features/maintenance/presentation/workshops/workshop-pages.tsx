import { notFound } from "next/navigation";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../components/ui/back-link/back-link";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { FormActions, FormSection } from "../../../../components/ui/form-field/form-field";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../components/ui/pagination/pagination";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { MaintenanceListFilters } from "../shared/list/maintenance-list-filters";
import { maintenanceSearch, maintenancePageHref, type MaintenanceSearchParams } from "../shared/list/maintenance-navigation";
import { MaintenanceActivity, MaintenanceRowLinks, MaintenanceRecordSummary } from "../shared/record/maintenance-record-summary";
import { WorkshopForm } from "./workshop-form";

const path = "/maintenance/workshops";
export async function WorkshopsPage({ searchParams }: { searchParams: MaintenanceSearchParams }) {
  const criteria = maintenanceSearch(searchParams);
  let result;
  try { result = await makeMaintenanceReferences().workshops(criteria); }
  catch { return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="تعمیرگاه‌ها" /><ResultState variant="error" title="دریافت تعمیرگاه‌ها امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={path}>تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="تعمیرگاه‌ها" description="مشخصات و راه‌های تماس تعمیرگاه‌های داخلی و بیرونی را مدیریت کنید." action={<ActionLink href={`${path}/create`} variant="primary">ثبت تعمیرگاه</ActionLink>} />
    <MaintenanceListFilters criteria={criteria} label="جستجوی تعمیرگاه" placeholder="نام، نوع فعالیت، تلفن، مسئول تماس یا نشانی" />
    {result.rows.length ? <><DataTable caption="فهرست تعمیرگاه‌ها"><thead><tr>{["نام تعمیرگاه", "نوع فعالیت", "وابستگی", "تلفن", "مسئول تماس", "وضعیت", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.workshopType}</td><td>{row.isInternal ? "داخلی سازمان" : "بیرون سازمان"}</td><td><TechnicalValue>{row.phone ?? "—"}</TechnicalValue></td><td>{row.contactPerson ?? "—"}</td><td><MaintenanceActivity active={row.isActive} /></td><td><MaintenanceRowLinks name={row.name} href={`${path}/${row.id}`} /></td></tr>)}</tbody></DataTable>
    <RecordCardList>{result.rows.map(row => <RecordCard key={row.id}><RecordCardHeader title={row.name} badge={<MaintenanceActivity active={row.isActive} />} /><RecordCardDetails><RecordCardDetail label="نوع فعالیت">{row.workshopType}</RecordCardDetail><RecordCardDetail label="وابستگی">{row.isInternal ? "داخلی سازمان" : "بیرون سازمان"}</RecordCardDetail><RecordCardDetail label="تلفن"><TechnicalValue>{row.phone ?? "ثبت نشده"}</TechnicalValue></RecordCardDetail><RecordCardDetail label="مسئول تماس">{row.contactPerson ?? "ثبت نشده"}</RecordCardDetail></RecordCardDetails><MaintenanceRowLinks name={row.name} href={`${path}/${row.id}`} /></RecordCard>)}</RecordCardList></> : <ResultState title="تعمیرگاهی برای نمایش وجود ندارد" description="تعمیرگاه ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های تعمیرگاه‌ها" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => maintenancePageHref(path, searchParams, page)} />
  </PageShell>;
}
export async function WorkshopRecordPage({ id, edit = false }: { id?: number; edit?: boolean }) {
  const record = id === undefined ? undefined : await makeMaintenanceReferences().workshop(id);
  if (record === null) notFound();
  return <PageShell width={edit || !record ? "narrow" : "wide"}><PageHeader eyebrow="تعمیرات و نگهداری" title={!record ? "ثبت تعمیرگاه" : edit ? "ویرایش تعمیرگاه" : record.name} action={<BackLink href={path} label="بازگشت به تعمیرگاه‌ها" />} compactAction />
    {edit || !record ? <WorkshopForm record={record} /> : <><FormSection title="مشخصات تعمیرگاه" aside={<MaintenanceActivity active={record.isActive} />}><MaintenanceRecordSummary fields={[["نوع فعالیت", record.workshopType], ["وابستگی", record.isInternal ? "داخلی سازمان" : "بیرون سازمان"], ["تلفن", <TechnicalValue key="phone">{record.phone ?? "ثبت نشده"}</TechnicalValue>], ["مسئول تماس", record.contactPerson], ["نشانی", record.address], ["توضیحات", record.description]]} /></FormSection>
      <FormSection title="تعمیرکاران این تعمیرگاه">{record.technicians.length ? <><DataTable caption="تعمیرکاران این تعمیرگاه"><thead><tr><th scope="col">نام و نام خانوادگی</th><th scope="col">تخصص</th><th scope="col">وضعیت</th><th scope="col">عملیات</th></tr></thead><tbody>{record.technicians.map(technician => <tr key={technician.id}><td>{technician.firstName} {technician.lastName}</td><td>{technician.specialty ?? "—"}</td><td><MaintenanceActivity active={technician.isActive} /></td><td><MaintenanceRowLinks name={`${technician.firstName} ${technician.lastName}`} href={`/maintenance/technicians/${technician.id}`} /></td></tr>)}</tbody></DataTable><RecordCardList>{record.technicians.map(technician => <RecordCard key={technician.id}><RecordCardHeader title={`${technician.firstName} ${technician.lastName}`} badge={<MaintenanceActivity active={technician.isActive} />} /><RecordCardDetails><RecordCardDetail label="تخصص">{technician.specialty ?? "ثبت نشده"}</RecordCardDetail></RecordCardDetails><ActionLink href={`/maintenance/technicians/${technician.id}`}>پروندهٔ تعمیرکار</ActionLink></RecordCard>)}</RecordCardList></> : <p>تعمیرکاری برای این تعمیرگاه ثبت نشده است.</p>}</FormSection>
      <FormSection title="سوابق مرتبط"><p>تعداد پرونده‌های تعمیر ثبت‌شده: <TechnicalValue>{record.workOrderCount}</TechnicalValue></p></FormSection>
      <FormActions separated><ActionLink href={`${path}/${record.id}/edit`} variant="primary">ویرایش تعمیرگاه</ActionLink></FormActions></>}
  </PageShell>;
}
