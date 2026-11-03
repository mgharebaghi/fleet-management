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
import { TechnicianForm } from "./technician-form";

const path = "/maintenance/technicians";
export async function TechniciansPage({ searchParams }: { searchParams: MaintenanceSearchParams }) {
  const criteria = maintenanceSearch(searchParams);
  let result;
  try { result = await makeMaintenanceReferences().technicians(criteria); }
  catch { return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="تعمیرکاران" /><ResultState variant="error" title="دریافت تعمیرکاران امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={path}>تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="تعمیرکاران" description="تعمیرکاران مستقل یا وابسته به تعمیرگاه و تخصص آن‌ها را مدیریت کنید." action={<ActionLink href={`${path}/create`} variant="primary">ثبت تعمیرکار</ActionLink>} />
    <MaintenanceListFilters criteria={criteria} label="جستجوی تعمیرکار" placeholder="نام، نام خانوادگی، همراه، تخصص یا تعمیرگاه" />
    {result.rows.length ? <><DataTable caption="فهرست تعمیرکاران"><thead><tr>{["نام و نام خانوادگی", "شمارهٔ همراه", "تخصص", "تعمیرگاه", "وضعیت", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td>{row.firstName} {row.lastName}</td><td><TechnicalValue>{row.mobile ?? "—"}</TechnicalValue></td><td>{row.specialty ?? "—"}</td><td>{row.workshopName ?? "مستقل از تعمیرگاه"}{row.workshopActive === false ? " (غیرفعال)" : ""}</td><td><MaintenanceActivity active={row.isActive} /></td><td><MaintenanceRowLinks name={`${row.firstName} ${row.lastName}`} href={`${path}/${row.id}`} /></td></tr>)}</tbody></DataTable>
    <RecordCardList>{result.rows.map(row => <RecordCard key={row.id}><RecordCardHeader title={`${row.firstName} ${row.lastName}`} badge={<MaintenanceActivity active={row.isActive} />} /><RecordCardDetails><RecordCardDetail label="شمارهٔ همراه"><TechnicalValue>{row.mobile ?? "ثبت نشده"}</TechnicalValue></RecordCardDetail><RecordCardDetail label="تخصص">{row.specialty ?? "ثبت نشده"}</RecordCardDetail><RecordCardDetail label="تعمیرگاه">{row.workshopName ?? "مستقل از تعمیرگاه"}{row.workshopActive === false ? " (غیرفعال)" : ""}</RecordCardDetail></RecordCardDetails><MaintenanceRowLinks name={`${row.firstName} ${row.lastName}`} href={`${path}/${row.id}`} /></RecordCard>)}</RecordCardList></> : <ResultState title="تعمیرکاری برای نمایش وجود ندارد" description="تعمیرکار ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های تعمیرکاران" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => maintenancePageHref(path, searchParams, page)} />
  </PageShell>;
}
export async function TechnicianRecordPage({ id, edit = false }: { id?: number; edit?: boolean }) {
  const manager = makeMaintenanceReferences();
  const record = id === undefined ? undefined : await manager.technician(id);
  if (record === null) notFound();
  const workshops = edit || !record ? await manager.workshopOptions() : [];
  const name = record ? `${record.firstName} ${record.lastName}` : "";
  return <PageShell width={edit || !record ? "narrow" : "wide"}><PageHeader eyebrow="تعمیرات و نگهداری" title={!record ? "ثبت تعمیرکار" : edit ? "ویرایش تعمیرکار" : name} action={<BackLink href={path} label="بازگشت به تعمیرکاران" />} compactAction />
    {edit || !record ? <TechnicianForm record={record} workshops={workshops} /> : <><FormSection title="مشخصات تعمیرکار" aside={<MaintenanceActivity active={record.isActive} />}><MaintenanceRecordSummary fields={[["نام", record.firstName], ["نام خانوادگی", record.lastName], ["شمارهٔ همراه", <TechnicalValue key="mobile">{record.mobile ?? "ثبت نشده"}</TechnicalValue>], ["تخصص", record.specialty], ["تعمیرگاه", record.workshopId ? <ActionLink key="workshop" href={`/maintenance/workshops/${record.workshopId}`}>{record.workshopName}{record.workshopActive === false ? " (غیرفعال)" : ""}</ActionLink> : "مستقل از تعمیرگاه"], ["توضیحات", record.description]]} /></FormSection><FormActions separated><ActionLink href={`${path}/${record.id}/edit`} variant="primary">ویرایش تعمیرکار</ActionLink></FormActions></>}
  </PageShell>;
}
