import { ServicePlanFormPage } from "@/features/maintenance/presentation/service-plans/service-plan-form-page";
export const metadata = { title: "ویرایش برنامهٔ سرویس" };
export default async function Page({ params }: { params: Promise<{ planId: string }> }) { return <ServicePlanFormPage id={Number((await params).planId)} />; }
