import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { makeManageStock } from "../../../composition/stock.factory";
import { stockSearch, type StockSearchParams } from "../shared/stock-navigation";
import { StockForm } from "./stock-form";

export async function StockCreatePage({ searchParams }: { searchParams: StockSearchParams }) {
  const criteria = stockSearch(searchParams);
  let references;
  try { references = await makeManageStock().references(); }
  catch { return <PageShell><ResultState variant="error" description="لطفاً دوباره تلاش کنید." title="دریافت اطلاعات انبار و قطعات امکان‌پذیر نبود" action={<ActionLink href="/inventory/movements/create">تلاش دوباره</ActionLink>} /></PageShell>; }
  const missingWarehouse = !references.warehouses.some(row => row.active);
  const missingPart = !references.parts.some(row => row.active);
  const missingTitle = missingWarehouse && missingPart ? "برای ثبت گردش، قطعه و انبار فعال لازم است" : missingWarehouse ? "برای ثبت گردش، انبار فعال لازم است" : "برای ثبت گردش، قطعهٔ فعال لازم است";
  const missingDescription = [
    missingWarehouse ? references.warehouses.length ? "انبارهای موجود غیرفعال‌اند؛ از مدیریت انبارها یک انبار را فعال کنید." : "هنوز انباری ثبت نشده است؛ ابتدا انبار را ثبت کنید." : "",
    missingPart ? references.parts.length ? "قطعات موجود غیرفعال‌اند؛ از ویرایش قطعه، وضعیت آن را فعال کنید." : "هنوز قطعه‌ای ثبت نشده است؛ ابتدا قطعه را ثبت کنید." : "",
  ].filter(Boolean).join(" ");
  return <PageShell><PageHeader eyebrow="قطعات و انبار" title="ثبت گردش انبار" action={<BackLink label="بازگشت به گردش انبار" href="/inventory/movements" />} compactAction />
    {missingWarehouse || missingPart ? <ResultState title={missingTitle} description={missingDescription} action={<FormActions>
      {missingWarehouse && <ActionLink href={references.warehouses.length ? "/inventory/warehouses?active=all" : "/inventory/warehouses/create"}>{references.warehouses.length ? "مدیریت انبارها" : "ثبت انبار"}</ActionLink>}
      {missingPart && <ActionLink href={references.parts.length ? "/inventory/parts?active=all" : "/inventory/parts/create"}>{references.parts.length ? "مدیریت قطعات" : "ثبت قطعه"}</ActionLink>}
    </FormActions>} /> : <StockForm references={references} warehouseId={String(criteria.warehouseId ?? "")} partId={String(criteria.partId ?? "")} />}
  </PageShell>;
}
