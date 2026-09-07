import { notFound } from "next/navigation";

import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { makeGetVehicleInsurance, makeListInsuranceVehicles } from "../../../composition/vehicle-insurances/vehicle-insurance.factory";
import { UpdateVehicleInsuranceForm } from "./update-vehicle-insurance-form";

const UPDATE_INSURANCE_TITLE_ID = "update-vehicle-insurance-title";

export async function UpdateVehicleInsurancePage({
  vehicleInsuranceId,
}: {
  vehicleInsuranceId: string;
}) {
  const insurance = await makeGetVehicleInsurance().execute(vehicleInsuranceId);
  if (!insurance) {
    notFound();
  }

  let vehicles;
  try {
    vehicles = await makeListInsuranceVehicles().execute();
  } catch {
    return (
      <PageShell width="narrow" labelledBy={UPDATE_INSURANCE_TITLE_ID}>
        <PageHeader eyebrow="مدیریت ناوگان" title="ویرایش بیمه خودرو" titleId={UPDATE_INSURANCE_TITLE_ID} />
        <ResultState
          variant="error"
          title="دریافت فهرست خودروها امکان‌پذیر نبود"
          description="لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید."
          action={<ActionLink href={`/fleet/vehicle-insurances/${vehicleInsuranceId}/edit`}>تلاش دوباره</ActionLink>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow" labelledBy={UPDATE_INSURANCE_TITLE_ID}>
      <PageHeader
        eyebrow="مدیریت ناوگان"
        title="ویرایش بیمه خودرو"
        titleId={UPDATE_INSURANCE_TITLE_ID}
        description={`ویرایش بیمه ${insurance.insuranceType} برای ${insurance.vehicle.brandName} ${insurance.vehicle.modelName}`}
        action={<BackLink label="انصراف و بازگشت به بیمه‌ها" href="/fleet/vehicle-insurances" />}
        compactAction
      />
      <UpdateVehicleInsuranceForm insurance={insurance} vehicles={vehicles} />
    </PageShell>
  );
}
