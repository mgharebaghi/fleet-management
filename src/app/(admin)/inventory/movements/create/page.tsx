import { StockCreatePage } from "@/features/inventory/presentation/stock/form/stock-create-page";
import type { StockSearchParams } from "@/features/inventory/presentation/stock/shared/stock-navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "ثبت گردش انبار" };
export default async function StockRoute({ searchParams }: { searchParams: Promise<StockSearchParams> }) { return <StockCreatePage searchParams={await searchParams} />; }
