import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import { RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail, RecordCardList } from "../../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import type { PartRecord as Part } from "../../../application/parts/part-records";
import { makeManageParts } from "../../../composition/part.factory";
import { PartFilters } from "./part-filters";
import { PartRowActions } from "./part-row-actions";
import { parsePartListParams, partPageHref, type PartListSearchParams } from "./part-list-navigation";

const stateBadge = (part: Part) => <StatusBadge label={part.isActive ? "فعال" : "غیرفعال"} tone={part.isActive ? "positive" : "negative"} />;
const details = (part: Part) => <PartRowActions part={part} />;

export async function PartsPage({ searchParams }: { searchParams: PartListSearchParams }) {
  const criteria = parsePartListParams(searchParams);
  let result;
  try { result = await makeManageParts().list(criteria); }
  catch { return <PageShell><PageHeader eyebrow="قطعات و انبار" title="قطعات" /><ResultState variant="error" title="دریافت اطلاعات قطعات امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/inventory/parts">تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell>
    <PageHeader eyebrow="قطعات و انبار" title="قطعات" description="قطعات را با مشخصات، واحد و دسته‌بندی جستجو و مدیریت کنید." action={<ActionLink href="/inventory/parts/create" variant="primary">ثبت قطعه</ActionLink>} />
    <PartFilters search={criteria.search} active={criteria.active} />
    {result.parts.length ? <>
      <DataTable caption="فهرست قطعات">
        <thead><tr><th scope="col">کد قطعه</th><th scope="col">نام قطعه</th><th scope="col">شمارهٔ فنی</th><th scope="col">سازنده</th><th scope="col">واحد</th><th scope="col">دسته‌بندی</th><th scope="col">وضعیت</th><th scope="col">عملیات</th></tr></thead>
        <tbody>{result.parts.map(part => <tr key={part.id}><td><TechnicalValue>{part.code}</TechnicalValue></td><td>{part.name}</td><td><TechnicalValue>{part.partNumber ?? "—"}</TechnicalValue></td><td>{part.manufacturer ?? "—"}</td><td>{part.unitName}</td><td>{part.categoryName ?? "—"}</td><td>{stateBadge(part)}</td><td>{details(part)}</td></tr>)}</tbody>
      </DataTable>
      <RecordCardList>{result.parts.map(part => <RecordCard key={part.id}>
        <RecordCardHeader title={part.name} badge={stateBadge(part)} />
        <RecordCardDetails><RecordCardDetail label="کد قطعه"><TechnicalValue>{part.code}</TechnicalValue></RecordCardDetail><RecordCardDetail label="شمارهٔ فنی"><TechnicalValue>{part.partNumber ?? "ثبت نشده"}</TechnicalValue></RecordCardDetail><RecordCardDetail label="سازنده">{part.manufacturer ?? "ثبت نشده"}</RecordCardDetail><RecordCardDetail label="واحد">{part.unitName}</RecordCardDetail><RecordCardDetail label="دسته‌بندی">{part.categoryName ?? "ثبت نشده"}</RecordCardDetail></RecordCardDetails>
        {details(part)}
      </RecordCard>)}</RecordCardList>
    </> : <ResultState title="قطعه‌ای برای نمایش وجود ندارد" description="یک قطعه ثبت کنید یا جستجو و فیلتر را تغییر دهید." action={<ActionLink href="/inventory/parts?active=all">نمایش همهٔ قطعات</ActionLink>} />}
    <Pagination label="صفحه‌های قطعات" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => partPageHref(searchParams, page)} />
  </PageShell>;
}
