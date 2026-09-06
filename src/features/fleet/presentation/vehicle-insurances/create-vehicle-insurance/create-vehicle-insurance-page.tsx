import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { makeListInsuranceVehicles } from "../../../composition/vehicle-insurances/vehicle-insurance.factory";
import { CreateVehicleInsuranceForm } from "./create-vehicle-insurance-form";

export async function CreateVehicleInsurancePage() {
  let vehicles;
  try { vehicles = await makeListInsuranceVehicles().execute(); }
  catch {
    return <PageShell width="narrow">
      <PageHeader eyebrow="مدیریت ناوگان" title="ثبت بیمه خودرو" />
      <ResultState variant="error" title="دریافت خودروها امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/fleet/vehicle-insurances/create">تلاش دوباره</ActionLink>} />
    </PageShell>;
  }
  return <PageShell width="narrow" labelledBy="create-insurance-title">
    <PageHeader eyebrow="مدیریت ناوگان" title="ثبت بیمه خودرو" titleId="create-insurance-title" description="خودرو، مشخصات و دوره بیمه را وارد کنید. شرکت، شماره بیمه‌نامه و مبالغ اختیاری هستند." />
    {vehicles.length ? <CreateVehicleInsuranceForm vehicles={vehicles} /> : <ResultState title="هنوز خودرویی ثبت نشده است" description="برای ثبت بیمه، ابتدا یک خودرو ثبت کنید." action={<ActionLink href="/fleet/vehicles/create">ثبت خودرو</ActionLink>} />}
  </PageShell>;
}
