import { ServicePlansPage } from "@/features/maintenance/presentation/service-plans/service-plans-page";
import type { PlanSearchParams } from "@/features/maintenance/presentation/service-plans/service-plan-presentation";
export const metadata = { title: "برنامه‌های سرویس" };
export default async function Page({ searchParams }: { searchParams: Promise<PlanSearchParams> }) { return <ServicePlansPage searchParams={await searchParams} />; }
