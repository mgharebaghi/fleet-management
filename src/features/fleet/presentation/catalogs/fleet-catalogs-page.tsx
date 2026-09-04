import { createFuelTypeAction } from "./fuel-type/action/create-fuel-type.action";
import { createVehicleBrandAction } from "./vehicle-brand/action/create-vehicle-brand.action";
import { createVehicleStatusAction } from "./vehicle-status/action/create-vehicle-status.action";
import { createVehicleTypeAction } from "./vehicle-type/action/create-vehicle-type.action";
import { createVehicleModelAction } from "./vehicle-model/action/create-vehicle-model.action";
import { makeListFuelTypes } from "../../composition/catalogs/fuel-type.factory";
import { makeListVehicleBrands } from "../../composition/catalogs/vehicle-brand.factory";
import { makeListVehicleStatuses } from "../../composition/catalogs/vehicle-status.factory";
import { makeListVehicleTypes } from "../../composition/catalogs/vehicle-type.factory";
import { makeListVehicleModels } from "../../composition/catalogs/vehicle-model.factory";
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
    <main className={styles.page} lang="fa" dir="rtl">
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>مدیریت ناوگان</p>
          <h1>اطلاعات پایه ناوگان</h1>
          <p className={styles.description}>
            برند، نوع، سوخت، وضعیت و مدل‌های خودرو را مشاهده و اطلاعات پایه
            جدید ثبت کنید.
          </p>
        </header>

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
            entries={vehicleBrandEntries}
            hasLoadError={vehicleBrands.hasLoadError}
            action={createVehicleBrandAction}
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
            entries={vehicleTypeEntries}
            hasLoadError={vehicleTypes.hasLoadError}
            action={createVehicleTypeAction}
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
            entries={fuelTypeEntries}
            hasLoadError={fuelTypes.hasLoadError}
            action={createFuelTypeAction}
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
            entries={vehicleStatusEntries}
            hasLoadError={vehicleStatuses.hasLoadError}
            action={createVehicleStatusAction}
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
          />
        </div>
      </section>
    </main>
  );
}
