import { notFound } from "next/navigation";

import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { makeListVehicleModels } from "../../../composition/catalogs/vehicle-model.factory";
import { makeListVehicleStatuses } from "../../../composition/catalogs/vehicle-status.factory";
import { makeGetVehicle } from "../../../composition/vehicles/vehicle.factory";
import { UpdateVehicleForm } from "./update-vehicle-form";

const UPDATE_VEHICLE_TITLE_ID = "update-vehicle-title";

export async function UpdateVehiclePage({ vehicleId }: { vehicleId: number }) {
  const vehicle = await makeGetVehicle().execute(vehicleId);
  if (!vehicle) {
    notFound();
  }

  let references;
  try {
    references = await Promise.all([
      makeListVehicleModels().execute(),
      makeListVehicleStatuses().execute(),
    ]);
  } catch {
    return (
      <PageShell width="narrow" labelledBy={UPDATE_VEHICLE_TITLE_ID}>
        <PageHeader
          eyebrow="مدیریت ناوگان"
          title="ویرایش خودرو"
          titleId={UPDATE_VEHICLE_TITLE_ID}
        />
        <ResultState
          variant="error"
          title="دریافت مدل‌ها و وضعیت‌ها امکان‌پذیر نبود"
          description="لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید."
          action={
            <ActionLink href={`/fleet/vehicles/${vehicleId}/edit`}>
              تلاش دوباره
            </ActionLink>
          }
        />
      </PageShell>
    );
  }

  const [models, statuses] = references;

  return (
    <PageShell width="narrow" labelledBy={UPDATE_VEHICLE_TITLE_ID}>
      <PageHeader
        eyebrow="مدیریت ناوگان"
        title="ویرایش خودرو"
        titleId={UPDATE_VEHICLE_TITLE_ID}
        description={`ویرایش اطلاعات خودروی ${vehicle.vehicleCode}`}
        action={
          <BackLink
            label="انصراف و بازگشت به خودروها"
            href="/fleet/vehicles"
          />
        }
        compactAction
      />

      <UpdateVehicleForm vehicle={vehicle} models={models} statuses={statuses} />
    </PageShell>
  );
}
