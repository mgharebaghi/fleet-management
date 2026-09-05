import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { makeListVehicleModels } from "../../../composition/catalogs/vehicle-model.factory";
import { makeListVehicleStatuses } from "../../../composition/catalogs/vehicle-status.factory";
import { CreateVehicleForm } from "./create-vehicle-form";

const CREATE_VEHICLE_TITLE_ID = "create-vehicle-title";

export async function CreateVehiclePage() {
  let references;

  try {
    references = await Promise.all([
      makeListVehicleModels().execute(),
      makeListVehicleStatuses().execute(),
    ]);
  } catch {
    return (
      <PageShell width="narrow" labelledBy={CREATE_VEHICLE_TITLE_ID}>
        <PageHeader
          eyebrow="مدیریت ناوگان"
          title="ثبت خودرو"
          titleId={CREATE_VEHICLE_TITLE_ID}
        />
        <ResultState
          variant="error"
          title="دریافت مدل‌ها و وضعیت‌ها امکان‌پذیر نبود"
          description="لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید."
          action={
            <ActionLink href="/fleet/vehicles/create">تلاش دوباره</ActionLink>
          }
        />
      </PageShell>
    );
  }

  const [models, statuses] = references;

  return (
    <PageShell width="narrow" labelledBy={CREATE_VEHICLE_TITLE_ID}>
      <PageHeader
        eyebrow="مدیریت ناوگان"
        title="ثبت خودرو"
        titleId={CREATE_VEHICLE_TITLE_ID}
        description="اطلاعات هویتی و مشخصات اولیه خودرو را وارد کنید."
      />

      {models.length === 0 || statuses.length === 0 ? (
        <ResultState
          title="اطلاعات پایه ناوگان کامل نیست"
          description="برای ثبت خودرو ابتدا مدل خودرو و وضعیت عملیاتی را در اطلاعات پایه ثبت کنید."
          action={
            <ActionLink href="/fleet/catalogs" variant="primary">
              اطلاعات پایه ناوگان
            </ActionLink>
          }
        />
      ) : (
        <CreateVehicleForm models={models} statuses={statuses} />
      )}
    </PageShell>
  );
}
