"use client";

import { useState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import type { CatalogEntryView } from "../components/catalog-entry-view";
import type { CreateVehicleModelActionState } from "./create-vehicle-model.action-state";
import { VehicleModelCreateDialog } from "./vehicle-model-create-dialog";
import { VehicleModelListDialog } from "./vehicle-model-list-dialog";
import styles from "./vehicle-model-summary-card.module.css";

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");
const PREVIEW_LIMIT = 4;

type CreateVehicleModelAction = (
  previousState: CreateVehicleModelActionState,
  formData: FormData,
) => Promise<CreateVehicleModelActionState>;

export type VehicleModelSummaryCardProps = {
  vehicleModels: VehicleModel[];
  brands: CatalogEntryView[];
  vehicleTypes: CatalogEntryView[];
  fuelTypes: CatalogEntryView[];
  hasLoadError: boolean;
  hasReferenceLoadError: boolean;
  action: CreateVehicleModelAction;
};

type OpenDialog = "none" | "create" | "list";

export function VehicleModelSummaryCard({
  vehicleModels,
  brands,
  vehicleTypes,
  fuelTypes,
  hasLoadError,
  hasReferenceLoadError,
  action,
}: VehicleModelSummaryCardProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>("none");
  const inactiveCount = vehicleModels.filter(
    (vehicleModel) => !vehicleModel.isActive,
  ).length;
  const previewModels = vehicleModels.slice(0, PREVIEW_LIMIT);

  function closeDialog() {
    setOpenDialog("none");
  }

  return (
    <section className={styles.card} aria-labelledby="vehicle-model-title">
      {hasLoadError ? (
        <>
          <header className={styles.header}>
            <h2 id="vehicle-model-title">مدل خودرو</h2>
            <p>مدل‌های ثبت‌شده در ناوگان را مدیریت کنید.</p>
          </header>
          <InlineNotice tone="danger" role="alert">
            دریافت فهرست مدل‌های خودرو امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.
          </InlineNotice>
        </>
      ) : (
        <>
          <div className={styles.body}>
            <div className={styles.info}>
              <header className={styles.header}>
                <h2 id="vehicle-model-title">مدل خودرو</h2>
                <p>مدل‌های ثبت‌شده در ناوگان را مدیریت کنید.</p>
              </header>

              <div
                className={styles.counts}
                aria-label="آمار مدل‌های خودرو"
                aria-live="polite"
              >
                <p className={styles.count}>
                  {persianNumberFormatter.format(vehicleModels.length)} مدل
                  ثبت‌شده
                </p>
                {inactiveCount > 0 && (
                  <p className={styles.inactiveCount}>
                    {persianNumberFormatter.format(inactiveCount)} مدل غیرفعال
                  </p>
                )}
              </div>

              <div className={styles.actions}>
                <ActionButton size="sm" onClick={() => setOpenDialog("create")}>
                  ایجاد مدل
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpenDialog("list")}
                >
                  مشاهده همه
                </ActionButton>
              </div>
            </div>

            <div className={styles.preview}>
              {previewModels.length > 0 ? (
                <>
                  <p className={styles.previewLabel}>مدل‌های اخیر</p>
                  <ul
                    className={styles.previewList}
                    aria-label="نمونه مدل‌های خودرو"
                  >
                    {previewModels.map((vehicleModel) => {
                      const vehicleTypeName =
                        vehicleModel.vehicleType?.name ?? "—";
                      const fuelTypeName = vehicleModel.fuelType?.name ?? "—";

                      return (
                        <li key={vehicleModel.id} className={styles.previewItem}>
                          <span className={styles.previewModelName}>
                            {vehicleModel.name}
                          </span>
                          <span className={styles.previewMeta}>
                            {vehicleModel.brand.name} · {vehicleTypeName} ·{" "}
                            {fuelTypeName}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <InlineNotice tone="empty">
                  هنوز مدل خودرویی ثبت نشده است.
                </InlineNotice>
              )}
            </div>
          </div>

          <VehicleModelCreateDialog
            open={openDialog === "create"}
            onClose={closeDialog}
            brands={brands}
            vehicleTypes={vehicleTypes}
            fuelTypes={fuelTypes}
            hasReferenceLoadError={hasReferenceLoadError}
            action={action}
          />
          <VehicleModelListDialog
            open={openDialog === "list"}
            onClose={closeDialog}
            vehicleModels={vehicleModels}
          />
        </>
      )}
    </section>
  );
}
