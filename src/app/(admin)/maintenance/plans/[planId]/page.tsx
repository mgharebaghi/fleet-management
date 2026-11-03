import { ServicePlanDetailsPage } from "@/features/maintenance/presentation/service-plans/service-plan-details-page";
export const metadata = { title: "پروندهٔ برنامهٔ سرویس" };
export default async function Page({ params }: { params: Promise<{ planId: string }> }) { return <ServicePlanDetailsPage id={Number((await params).planId)} />; }
