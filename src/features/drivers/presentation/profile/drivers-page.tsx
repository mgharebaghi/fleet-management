import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../components/ui/record-cards/record-cards";
import { Pagination } from "../../../../components/ui/pagination/pagination";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { makeReadDrivers } from "../../composition/driver.factory";
import { DriverFilters } from "../driver-filters";

type SearchParams = Record<string, string | string[] | undefined>;
const single = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
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
