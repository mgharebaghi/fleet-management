import { StockBalancesPage } from "@/features/inventory/presentation/stock/list/stock-pages";
import type { StockSearchParams } from "@/features/inventory/presentation/stock/shared/stock-navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "موجودی انبار" };
export default async function StockRoute({ searchParams }: { searchParams: Promise<StockSearchParams> }) { return <StockBalancesPage searchParams={await searchParams} />; }
