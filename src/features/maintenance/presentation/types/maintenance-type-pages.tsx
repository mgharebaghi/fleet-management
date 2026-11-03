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
import { MaintenanceActivity, MaintenanceRecordSummary } from "../shared/record/maintenance-record-summary";
import { MaintenanceTypeRowActions } from "./maintenance-type-row-actions";
import { MaintenanceTypeForm } from "./maintenance-type-form";

const path = "/maintenance/catalogs";
export async function MaintenanceTypesPage({ searchParams }: { searchParams: MaintenanceSearchParams }) {
  const criteria = maintenanceSearch(searchParams);
  let result;
  try { result = await makeMaintenanceReferences().types(criteria); }
  catch { return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="اطلاعات پایه" /><ResultState variant="error" title="دریافت انواع تعمیر و سرویس امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={path}>تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="اطلاعات پایه" description="انواع تعمیر و سرویس را تعریف کنید تا در درخواست‌ها و پرونده‌های تعمیر انتخاب شوند." action={<ActionLink href={`${path}/create`} variant="primary">ثبت نوع تعمیر و سرویس</ActionLink>} />
    <MaintenanceListFilters criteria={criteria} label="جستجوی نوع تعمیر و سرویس" placeholder="کد یا عنوان نوع تعمیر و سرویس" />
    {result.rows.length ? <><DataTable caption="انواع تعمیر و سرویس"><thead><tr>{["کد", "عنوان", "وضعیت", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td><TechnicalValue>{row.code}</TechnicalValue></td><td>{row.name}</td><td><MaintenanceActivity active={row.isActive} /></td><td><MaintenanceTypeRowActions record={row} /></td></tr>)}</tbody></DataTable>
    <RecordCardList>{result.rows.map(row => <RecordCard key={row.id}><RecordCardHeader title={row.name} badge={<MaintenanceActivity active={row.isActive} />} /><RecordCardDetails><RecordCardDetail label="کد"><TechnicalValue>{row.code}</TechnicalValue></RecordCardDetail></RecordCardDetails><MaintenanceTypeRowActions record={row} /></RecordCard>)}</RecordCardList></> : <ResultState title="نوع تعمیر و سرویسی برای نمایش وجود ندارد" description="نوع جدید ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های انواع تعمیر و سرویس" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => maintenancePageHref(path, searchParams, page)} />
  </PageShell>;
}
export async function MaintenanceTypeRecordPage({ id, edit = false }: { id?: number; edit?: boolean }) {
  const record = id === undefined ? undefined : await makeMaintenanceReferences().type(id);
  if (record === null) notFound();
  return <PageShell width={edit || !record ? "narrow" : "wide"}><PageHeader eyebrow="تعمیرات و نگهداری" title={!record ? "ثبت نوع تعمیر و سرویس" : edit ? "ویرایش نوع تعمیر و سرویس" : record.name} action={<BackLink href={path} label="بازگشت به انواع تعمیر و سرویس" />} compactAction />
    {edit || !record ? <MaintenanceTypeForm record={record} /> : <><FormSection title="مشخصات نوع تعمیر و سرویس" aside={<MaintenanceActivity active={record.isActive} />}><MaintenanceRecordSummary fields={[["کد", <TechnicalValue key="code">{record.code}</TechnicalValue>], ["عنوان", record.name], ["توضیحات", record.description]]} /></FormSection><FormActions separated><ActionLink href={`${path}/${record.id}/edit`} variant="primary">ویرایش نوع تعمیر و سرویس</ActionLink></FormActions></>}
  </PageShell>;
}
