import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import { RecordCard, RecordCardHeader, RecordCardList, RecordCardDetails, RecordCardDetail } from "../../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { formatMoneyAmount } from "../../../../../components/ui/money-input/money-amount";
import { INSURANCE_PAGE_SIZE, MAX_INSURANCE_PAGE } from "../../../application/vehicle-insurances/list-vehicle-insurances/list-vehicle-insurances";
import type { InsuranceVehicle, VehicleInsuranceSummary } from "../../../application/vehicle-insurances/vehicle-insurance";
import { makeListVehicleInsurances } from "../../../composition/vehicle-insurances/vehicle-insurance.factory";
import { VehiclePlate } from "../../vehicles/list-vehicles/vehicle-plate";
import { ListVehicleInsurancesFilters } from "./list-vehicle-insurances-filters";
import styles from "./list-vehicle-insurances-page.module.css";

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;
const single = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });
const countFormat = new Intl.NumberFormat("fa-IR");
const amountText = (value: string | null) => value === null ? "—" : formatMoneyAmount(value);
const listPath = "/fleet/vehicle-insurances";

function CreateLink() { return <ActionLink href={`${listPath}/create`} variant="primary">ثبت بیمه خودرو</ActionLink>; }
function RecordStatus({ active }: { active: boolean }) { return <StatusBadge label={active ? "فعال" : "غیرفعال"} tone={active ? "positive" : "negative"} />; }

/** Vehicles sharing brand, model and plate need their code shown to tell them apart. */
function findAmbiguousVehicleIds(insurances: VehicleInsuranceSummary[]): Set<number> {
  const vehiclesById = new Map<number, InsuranceVehicle>();
  for (const insurance of insurances) vehiclesById.set(insurance.vehicle.vehicleId, insurance.vehicle);
  const key = (vehicle: InsuranceVehicle) => `${vehicle.brandName}|${vehicle.modelName}|${vehicle.plateNoLeftSide}|${vehicle.plateNoCenterChar}|${vehicle.plateNoRightSide}|${vehicle.plateNoIranNo}`;
  const countByKey = new Map<string, number>();
  for (const vehicle of vehiclesById.values()) countByKey.set(key(vehicle), (countByKey.get(key(vehicle)) ?? 0) + 1);
  const ambiguous = new Set<number>();
  for (const vehicle of vehiclesById.values()) if ((countByKey.get(key(vehicle)) ?? 0) > 1) ambiguous.add(vehicle.vehicleId);
  return ambiguous;
}

function VehicleCell({ vehicle, showCode }: { vehicle: InsuranceVehicle; showCode: boolean }) {
  return <>
    <span className={styles.primaryValue}>{vehicle.brandName} {vehicle.modelName}</span>
    <span className={styles.plateRow}><VehiclePlate vehicle={vehicle} /></span>
    {showCode && <span className={styles.secondaryValue}>کد <TechnicalValue>{vehicle.vehicleCode}</TechnicalValue></span>}
  </>;
}

function InsuranceMeta({ company, policyNo }: { company: string | null; policyNo: string | null }) {
  if (!company && !policyNo) return null;
  return <span className={styles.secondaryValue}>
    {company}
    {company && policyNo && <span className={styles.metaSeparator}>·</span>}
    {policyNo && <>شماره <TechnicalValue>{policyNo}</TechnicalValue></>}
  </span>;
}

function InsuranceRecords({ insurances }: { insurances: VehicleInsuranceSummary[] }) {
  const ambiguousVehicleIds = findAmbiguousVehicleIds(insurances);
  return <>
    <DataTable caption="فهرست بیمه خودروها" minWidth={860}>
      <thead><tr><th scope="col">خودرو</th><th scope="col">بیمه‌نامه</th><th scope="col">دوره بیمه</th><th scope="col">مبالغ</th><th scope="col">وضعیت رکورد</th></tr></thead>
      <tbody>{insurances.map(insurance => <tr key={insurance.vehicleInsuranceId}>
        <td className={styles.cell}><VehicleCell vehicle={insurance.vehicle} showCode={ambiguousVehicleIds.has(insurance.vehicle.vehicleId)} /></td>
        <td className={styles.cell}>
          <span className={styles.primaryValue}>{insurance.insuranceType}</span>
          <InsuranceMeta company={insurance.insuranceCompany} policyNo={insurance.policyNo} />
        </td>
        <td className={styles.cell}>
          <span className={styles.plainValue}>شروع <TechnicalValue>{dateFormat.format(insurance.startDate)}</TechnicalValue></span>
          <span className={styles.secondaryValue}>انقضا <TechnicalValue>{dateFormat.format(insurance.expireDate)}</TechnicalValue></span>
        </td>
        <td className={styles.cell}>
          <span className={styles.plainValue}>حق بیمه <TechnicalValue>{amountText(insurance.premiumAmount)}</TechnicalValue></span>
          <span className={styles.secondaryValue}>پوشش <TechnicalValue>{amountText(insurance.coverageAmount)}</TechnicalValue></span>
        </td>
        <td className={styles.cell}><RecordStatus active={insurance.isActive} /></td>
      </tr>)}</tbody>
    </DataTable>
    <RecordCardList>{insurances.map(insurance => <RecordCard key={insurance.vehicleInsuranceId}>
      <RecordCardHeader title={insurance.insuranceType} badge={<RecordStatus active={insurance.isActive} />} />
      <TechnicalValue>{insurance.vehicle.vehicleCode}</TechnicalValue><VehiclePlate vehicle={insurance.vehicle} />
      <RecordCardDetails>
        <RecordCardDetail label="شرکت بیمه">{insurance.insuranceCompany ?? "—"}</RecordCardDetail>
        <RecordCardDetail label="شماره بیمه‌نامه"><TechnicalValue>{insurance.policyNo ?? "—"}</TechnicalValue></RecordCardDetail>
        <RecordCardDetail label="شروع (شمسی)"><TechnicalValue>{dateFormat.format(insurance.startDate)}</TechnicalValue></RecordCardDetail>
        <RecordCardDetail label="انقضا (شمسی)"><TechnicalValue>{dateFormat.format(insurance.expireDate)}</TechnicalValue></RecordCardDetail>
        <RecordCardDetail label="حق بیمه (تومان)"><TechnicalValue>{amountText(insurance.premiumAmount)}</TechnicalValue></RecordCardDetail>
        <RecordCardDetail label="سقف پوشش (تومان)"><TechnicalValue>{amountText(insurance.coverageAmount)}</TechnicalValue></RecordCardDetail>
      </RecordCardDetails>
    </RecordCard>)}</RecordCardList>
  </>;
}

export async function ListVehicleInsurancesPage({ searchParams }: { searchParams: SearchParams }) {
  const search = single(searchParams.search) ?? "";
  const requestedActive = single(searchParams.active);
  const active = requestedActive === "all" || requestedActive === "inactive" ? requestedActive : "active";
  const requestedPage = Number(single(searchParams.page));
  const pageNumber = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, MAX_INSURANCE_PAGE) : 1;
  const hasCriteria = Boolean(search.trim() || active !== "active");
  let result;
  let hasAnyInsurances = true;
  try {
    const list = makeListVehicleInsurances();
    result = await list.execute({ search, isActive: active === "all" ? null : active === "active", pageNumber });
    if (!hasCriteria && result.totalCount === 0) hasAnyInsurances = (await list.execute({ isActive: null, pageSize: 1 })).totalCount > 0;
  } catch {
    return <PageShell><PageHeader eyebrow="مدیریت ناوگان" title="بیمه خودروها" action={<CreateLink />} />
      <ResultState variant="error" title="دریافت بیمه‌ها امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={listPath}>تلاش دوباره</ActionLink>} />
    </PageShell>;
  }
  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(searchParams)) {
      for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(name, entry);
    }
    params.set("page", String(page));
    return `${listPath}?${params}`;
  };
  return <PageShell>
    <PageHeader eyebrow="مدیریت ناوگان" title="بیمه خودروها" description="سوابق و دوره بیمه خودروها را مشاهده کنید. وضعیت رکورد مستقل از تاریخ انقضا است." action={<CreateLink />} />
    <ListVehicleInsurancesFilters search={search} active={active} />
    {result.insurances.length > 0 ? <>
      <p aria-live="polite">{countFormat.format(result.totalCount)} بیمه‌نامه</p>
      <InsuranceRecords insurances={result.insurances} />
    </> : result.totalCount > 0 ? <ResultState title="این صفحه خالی است" description="شماره صفحه از تعداد نتیجه‌ها بیشتر است." action={<ActionLink href={buildHref(1)}>صفحه اول</ActionLink>} />
      : hasCriteria ? <ResultState title="بیمه‌ای مطابق جستجو یا فیلتر پیدا نشد" description="عبارت جستجو یا فیلتر را تغییر دهید." action={<ActionLink href={listPath}>پاک کردن جستجو و فیلتر</ActionLink>} />
      : hasAnyInsurances ? <ResultState title="بیمه فعالی برای نمایش وجود ندارد" description="می‌توانید رکوردهای غیرفعال را هم مشاهده کنید." action={<ActionLink href={`${listPath}?active=all`}>نمایش همه بیمه‌ها</ActionLink>} />
      : <ResultState title="هنوز بیمه‌ای ثبت نشده است" description="اولین بیمه خودرو را ثبت کنید." action={<CreateLink />} />}
    <Pagination label="صفحه‌بندی بیمه خودروها" currentPage={pageNumber} totalPages={Math.ceil(result.totalCount / INSURANCE_PAGE_SIZE)} buildHref={buildHref} />
  </PageShell>;
}
