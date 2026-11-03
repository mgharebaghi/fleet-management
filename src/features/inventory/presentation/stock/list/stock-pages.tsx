import { RecordDetailsButton } from "../../../../../components/ui/record-details-button/record-details-button";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../../components/ui/record-cards/record-cards";
import { IconActionLink } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { ViewIcon } from "../../../../../components/ui/icon/icons";
import { makeManageStock } from "../../../composition/stock.factory";
import type { StockBalance, StockMovement, StockSearch } from "../../../application/stock/stock-records";
import { formatMoneyAmount } from "../../../../../components/ui/money-input/money-amount";
import { stockSearch, stockPageHref, type StockSearchParams } from "../shared/stock-navigation";
import { stockDateFormatter } from "../shared/stock-messages";
import { stockBalanceStatuses, stockMovementStatus } from "../shared/stock-status";
import { StockFilters } from "./stock-filters";
import styles from "./stock-pages.module.css";

const balanceBadge = (row: StockBalance) => <>{stockBalanceStatuses(row).map(status => <StatusBadge key={status.label} {...status} />)}</>;
const stockCode = (label: string, value: string | null) => value === null ? null : <span className={styles.code}>{label}: <TechnicalValue>{value}</TechnicalValue></span>;
const quantity = (value: string | null) => value === null ? "قابل محاسبه نیست" : <TechnicalValue>{value}</TechnicalValue>;
const movementLink = (row: StockBalance) => <IconActionLink href={`/inventory/movements?partId=${row.partId}${row.warehouseId ? `&warehouseId=${row.warehouseId}` : ""}`} label={`گردش ${row.partName} در ${row.warehouseName ?? "بدون گردش"}`} icon={<ViewIcon />} />;
const money = (value: string | null) => value === null ? "ثبت نشده" : <><TechnicalValue>{formatMoneyAmount(value)}</TechnicalValue> تومان</>;
function createHref(criteria: StockSearch) {
  const query = new URLSearchParams();
  if (criteria.partId) query.set("partId", String(criteria.partId));
  if (criteria.warehouseId) query.set("warehouseId", String(criteria.warehouseId));
  return `/inventory/movements/create${query.size ? `?${query}` : ""}`;
}

export async function StockBalancesPage({ searchParams }: { searchParams: StockSearchParams }) {
  const criteria = stockSearch(searchParams), manage = makeManageStock();
  let result, references;
  try { [result, references] = await Promise.all([manage.balances(criteria), manage.references()]); }
  catch { return <PageShell><PageHeader eyebrow="قطعات و انبار" title="موجودی انبار" /><ResultState variant="error" description="لطفاً دوباره تلاش کنید." title="دریافت موجودی امکان‌پذیر نبود" action={<ActionLink href="/inventory/stock">تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell><PageHeader eyebrow="قطعات و انبار" title="موجودی انبار" description="موجودی صفر با «عدم موجودی» مشخص می‌شود؛ برای موجودی مثبت، هشدارها بر پایهٔ مجموع تمام انبارها هستند." action={<ActionLink href={createHref(criteria)} variant="primary">ثبت گردش</ActionLink>} />
    <StockFilters criteria={criteria} references={references} movements={false} />
    <InlineNotice tone="info">فیلترها موجودی را تغییر نمی‌دهند. قطعهٔ بدون گردش، موجودی صفر دارد. مصرف ثبت‌شده در تعمیر، موجودی انبار را خودکار کم نمی‌کند.</InlineNotice>
    {result.rows.length ? <><DataTable caption="موجودی قطعات در انبارها"><thead><tr>{["قطعه", "انبار", "واحد", "موجودی این انبار", "مجموع تمام انبارها", "وضعیت موجودی", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={`${row.partId}-${row.warehouseId}`}><td>{row.partName}{stockCode("کد قطعه", row.partCode)}{!row.partActive && <StatusBadge label="غیرفعال" tone="negative" />}</td><td>{row.warehouseName ?? "بدون گردش"}{stockCode("کد انبار", row.warehouseCode)}{row.warehouseActive === false && <StatusBadge label="غیرفعال" tone="negative" />}</td><td>{row.unitName}</td><td>{quantity(row.balance)}</td><td>{quantity(row.totalBalance)}</td><td>{balanceBadge(row)}</td><td>{movementLink(row)}</td></tr>)}</tbody></DataTable>
      <RecordCardList>{result.rows.map(row => <RecordCard key={`${row.partId}-${row.warehouseId}`}><RecordCardHeader title={row.partName} badge={balanceBadge(row)} /><RecordCardDetails><RecordCardDetail label="کد قطعه"><TechnicalValue>{row.partCode}</TechnicalValue></RecordCardDetail><RecordCardDetail label="انبار">{row.warehouseName ?? "بدون گردش"}{row.warehouseActive === false ? " (غیرفعال)" : ""}{stockCode("کد انبار", row.warehouseCode)}</RecordCardDetail><RecordCardDetail label="واحد">{row.unitName}</RecordCardDetail><RecordCardDetail label="موجودی این انبار">{quantity(row.balance)}</RecordCardDetail><RecordCardDetail label="مجموع تمام انبارها">{quantity(row.totalBalance)}</RecordCardDetail></RecordCardDetails>{movementLink(row)}</RecordCard>)}</RecordCardList></> : <ResultState title="موجودی‌ای مطابق جستجو پیدا نشد" description="فیلترها را تغییر دهید یا ابتدا قطعه تعریف کنید." />}
    <Pagination label="صفحه‌های موجودی" currentPage={Math.max(1, criteria.page || 1)} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => stockPageHref("/inventory/stock", searchParams, page)} />
  </PageShell>;
}

export async function StockMovementsPage({ searchParams }: { searchParams: StockSearchParams }) {
  const criteria = stockSearch(searchParams), manage = makeManageStock();
  let result, references;
  try { [result, references] = await Promise.all([manage.movements(criteria), manage.references()]); }
  catch { return <PageShell><PageHeader eyebrow="قطعات و انبار" title="گردش انبار" /><ResultState variant="error" description="لطفاً دوباره تلاش کنید." title="دریافت گردش انبار امکان‌پذیر نبود" action={<ActionLink href="/inventory/movements">تلاش دوباره</ActionLink>} /></PageShell>; }
  const recorded = typeof searchParams.recorded === "string" && /^\d+$/.test(searchParams.recorded) ? searchParams.recorded : null;
  return <PageShell><PageHeader eyebrow="قطعات و انبار" title="گردش انبار" description="گردش‌ها سوابق قطعی هستند. اصلاح با ثبت گردش جدید و توضیح انجام می‌شود." action={<ActionLink href={createHref(criteria)} variant="primary">ثبت گردش</ActionLink>} />
    {recorded && result.rows.some(row => row.id === recorded) && <InlineNotice tone="info">گردش شمارهٔ <TechnicalValue>{recorded}</TechnicalValue> ثبت شد.</InlineNotice>}
    <StockFilters criteria={criteria} references={references} movements />
    <InlineNotice tone="info">برگشت و اصلاح مستقل‌اند و به گردش اولیه یا پروندهٔ تعمیر متصل نمی‌شوند. مبلغ‌ها قیمت ثبت‌شدهٔ هر واحد هستند، نه ارزش‌گذاری موجودی.</InlineNotice>
    {result.rows.length ? <><DataTable caption="سوابق گردش انبار"><thead><tr>{["شماره", "زمان ثبت", "قطعه", "انبار", "نوع گردش", "مقدار", "قیمت هر واحد", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(row => <MovementRow key={row.id} row={row} />)}</tbody></DataTable>
      <RecordCardList>{result.rows.map(row => <RecordCard key={row.id}><RecordCardHeader title={row.partName} badge={<StatusBadge {...stockMovementStatus(row.type)} />} /><RecordCardDetails><RecordCardDetail label="شماره"><TechnicalValue>{row.id}</TechnicalValue></RecordCardDetail><RecordCardDetail label="زمان ثبت">{stockDateFormatter.format(new Date(row.date))}</RecordCardDetail><RecordCardDetail label="انبار">{row.warehouseName ?? "بدون گردش"}{stockCode("کد انبار", row.warehouseCode)}</RecordCardDetail><RecordCardDetail label="کد قطعه"><TechnicalValue>{row.partCode}</TechnicalValue></RecordCardDetail><RecordCardDetail label="مقدار">{quantity(row.quantity)} {row.unitName}</RecordCardDetail><RecordCardDetail label="قیمت هر واحد">{money(row.unitPrice)}</RecordCardDetail><RecordCardDetail label="عملیات"><RecordDetailsButton title="گردش انبار" fields={[["شماره", row.id], ["قطعه", row.partName], ["نوع گردش", stockMovementStatus(row.type).label]]} description={row.description} /></RecordCardDetail></RecordCardDetails></RecordCard>)}</RecordCardList></> : <ResultState title="گردشی مطابق جستجو ثبت نشده است" description="گردش جدید ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های گردش" currentPage={Math.max(1, criteria.page || 1)} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => stockPageHref("/inventory/movements", searchParams, page)} />
  </PageShell>;
}
function MovementRow({ row }: { row: StockMovement }) {
  return <tr><td><TechnicalValue>{row.id}</TechnicalValue></td><td>{stockDateFormatter.format(new Date(row.date))}</td><td>{row.partName}{stockCode("کد قطعه", row.partCode)}</td><td>{row.warehouseName ?? "بدون گردش"}{stockCode("کد انبار", row.warehouseCode)}</td><td><StatusBadge {...stockMovementStatus(row.type)} /></td><td>{quantity(row.quantity)} {row.unitName}</td><td>{money(row.unitPrice)}</td><td><RecordDetailsButton title="گردش انبار" fields={[["شماره", row.id], ["قطعه", row.partName], ["انبار", row.warehouseName], ["نوع گردش", stockMovementStatus(row.type).label], ["مقدار", <span key="quantity">{quantity(row.quantity)}</span>], ["قیمت هر واحد", <span key="unit-price">{money(row.unitPrice)}</span>]]} description={row.description} /></td></tr>;
}
