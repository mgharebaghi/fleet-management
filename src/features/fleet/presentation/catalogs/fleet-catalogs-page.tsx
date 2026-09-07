import { createFuelTypeAction } from "./fuel-type/action/create-fuel-type.action";
import { deleteFuelTypeAction } from "./fuel-type/action/delete-fuel-type.action";
import { updateFuelTypeAction } from "./fuel-type/action/update-fuel-type.action";
import { createVehicleBrandAction } from "./vehicle-brand/action/create-vehicle-brand.action";
import { deleteVehicleBrandAction } from "./vehicle-brand/action/delete-vehicle-brand.action";
import { updateVehicleBrandAction } from "./vehicle-brand/action/update-vehicle-brand.action";
import { createVehicleStatusAction } from "./vehicle-status/action/create-vehicle-status.action";
import { deleteVehicleStatusAction } from "./vehicle-status/action/delete-vehicle-status.action";
import { updateVehicleStatusAction } from "./vehicle-status/action/update-vehicle-status.action";
import { createVehicleTypeAction } from "./vehicle-type/action/create-vehicle-type.action";
import { deleteVehicleTypeAction } from "./vehicle-type/action/delete-vehicle-type.action";
import { updateVehicleTypeAction } from "./vehicle-type/action/update-vehicle-type.action";
import { createVehicleModelAction } from "./vehicle-model/action/create-vehicle-model.action";
import { deleteVehicleModelAction } from "./vehicle-model/action/delete-vehicle-model.action";
import { updateVehicleModelAction } from "./vehicle-model/action/update-vehicle-model.action";
import { makeListFuelTypes } from "../../composition/catalogs/fuel-type.factory";
import { makeListVehicleBrands } from "../../composition/catalogs/vehicle-brand.factory";
import { makeListVehicleStatuses } from "../../composition/catalogs/vehicle-status.factory";
import { makeListVehicleTypes } from "../../composition/catalogs/vehicle-type.factory";
import { makeListVehicleModels } from "../../composition/catalogs/vehicle-model.factory";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import type { CatalogEntryView } from "./components/catalog-entry-view";
import { CatalogSummaryCard } from "./components/catalog-summary-card";
import { VehicleModelSummaryCard } from "./vehicle-model/vehicle-model-summary-card";
import styles from "./fleet-catalogs-page.module.css";

async function loadEntries<TEntry>(
  execute: () => Promise<TEntry[]>,
): Promise<{ entries: TEntry[]; hasLoadError: boolean }> {
  try {
    return { entries: await execute(), hasLoadError: false };
  } catch {
    return { entries: [], hasLoadError: true };
  }
}

export async function FleetCatalogsPage() {
  const [vehicleBrands, vehicleTypes, fuelTypes, vehicleStatuses, vehicleModels] =
    await Promise.all([
      loadEntries(() => makeListVehicleBrands().execute()),
      loadEntries(() => makeListVehicleTypes().execute()),
      loadEntries(() => makeListFuelTypes().execute()),
      loadEntries(() => makeListVehicleStatuses().execute()),
      loadEntries(() => makeListVehicleModels().execute()),
    ]);

  const vehicleBrandEntries: CatalogEntryView[] = vehicleBrands.entries.map(
    (entry) => ({ id: entry.id, name: entry.name, isActive: entry.isActive }),
  );
  const vehicleTypeEntries: CatalogEntryView[] = vehicleTypes.entries.map(
    (entry) => ({ id: entry.id, name: entry.name, isActive: entry.isActive }),
  );
  const fuelTypeEntries: CatalogEntryView[] = fuelTypes.entries.map(
    (entry) => ({ id: entry.id, name: entry.name, isActive: entry.isActive }),
  );
  const vehicleStatusEntries: CatalogEntryView[] = vehicleStatuses.entries.map(
    (entry) => ({ id: entry.id, name: entry.name }),
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت ناوگان"
        title="اطلاعات پایه ناوگان"
        description="برند، نوع، سوخت، وضعیت و مدل‌های خودرو را مشاهده و اطلاعات پایه جدید ثبت کنید."
      />

      <div className={styles.sections}>
        <CatalogSummaryCard
          fieldId="vehicle-brand-name"
          title="برند خودرو"
          description="برندهای ثبت‌شده خودرو در ناوگان."
          nameLabel="نام برند"
          submitLabel="ثبت برند"
          submitPendingLabel="در حال ثبت…"
          emptyStateMessage="هنوز برندی ثبت نشده است."
          duplicateMessage="این نام برند قبلاً ثبت شده است."
          inUseMessage="این برند در مدل‌های خودرو استفاده شده و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید."
          supportsActiveToggle
          entries={vehicleBrandEntries}
          hasLoadError={vehicleBrands.hasLoadError}
          action={createVehicleBrandAction}
          updateAction={updateVehicleBrandAction}
          deleteAction={deleteVehicleBrandAction}
        />

        <CatalogSummaryCard
          fieldId="vehicle-type-name"
          title="نوع خودرو"
          description="انواع ثبت‌شده خودرو در ناوگان."
          nameLabel="نام نوع خودرو"
          submitLabel="ثبت نوع خودرو"
          submitPendingLabel="در حال ثبت…"
          emptyStateMessage="هنوز نوع خودرویی ثبت نشده است."
          duplicateMessage="این نوع خودرو قبلاً ثبت شده است."
          inUseMessage="این نوع در مدل‌های خودرو استفاده شده و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید."
          supportsActiveToggle
          entries={vehicleTypeEntries}
          hasLoadError={vehicleTypes.hasLoadError}
          action={createVehicleTypeAction}
          updateAction={updateVehicleTypeAction}
          deleteAction={deleteVehicleTypeAction}
        />

        <CatalogSummaryCard
          fieldId="fuel-type-name"
          title="نوع سوخت"
          description="انواع ثبت‌شده سوخت در ناوگان."
          nameLabel="نام نوع سوخت"
          submitLabel="ثبت نوع سوخت"
          submitPendingLabel="در حال ثبت…"
          emptyStateMessage="هنوز نوع سوختی ثبت نشده است."
          duplicateMessage="این نوع سوخت قبلاً ثبت شده است."
          inUseMessage="این نوع سوخت در مدل‌های خودرو استفاده شده و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید."
          supportsActiveToggle
          entries={fuelTypeEntries}
          hasLoadError={fuelTypes.hasLoadError}
          action={createFuelTypeAction}
          updateAction={updateFuelTypeAction}
          deleteAction={deleteFuelTypeAction}
        />

        <CatalogSummaryCard
          fieldId="vehicle-status-name"
          title="وضعیت خودرو"
          description="وضعیت‌های ثبت‌شده خودرو در ناوگان."
          nameLabel="نام وضعیت"
          submitLabel="ثبت وضعیت"
          submitPendingLabel="در حال ثبت…"
          emptyStateMessage="هنوز وضعیتی ثبت نشده است."
          duplicateMessage="این وضعیت قبلاً ثبت شده است."
          inUseMessage="این وضعیت روی خودروها استفاده شده و قابل حذف نیست."
          supportsActiveToggle={false}
          entries={vehicleStatusEntries}
          hasLoadError={vehicleStatuses.hasLoadError}
          action={createVehicleStatusAction}
          updateAction={updateVehicleStatusAction}
          deleteAction={deleteVehicleStatusAction}
        />

        <VehicleModelSummaryCard
          vehicleModels={vehicleModels.entries}
          brands={vehicleBrandEntries}
          vehicleTypes={vehicleTypeEntries}
          fuelTypes={fuelTypeEntries}
          hasLoadError={vehicleModels.hasLoadError}
          hasReferenceLoadError={
            vehicleBrands.hasLoadError ||
            vehicleTypes.hasLoadError ||
            fuelTypes.hasLoadError
          }
          action={createVehicleModelAction}
          updateAction={updateVehicleModelAction}
          deleteAction={deleteVehicleModelAction}
        />
      </div>
    </PageShell>
  );
}
