"use client";

import { useState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import { CatalogDeleteDialog } from "../components/catalog-delete-dialog";
import type { CatalogEntryView } from "../components/catalog-entry-view";
import type { CreateVehicleModelActionState } from "./create-vehicle-model.action-state";
import type { DeleteCatalogEntryActionState } from "../delete-catalog-entry/delete-catalog-entry.action-state";
import type { UpdateVehicleModelActionState } from "./update-vehicle-model.action-state";
import { VehicleModelCreateDialog } from "./vehicle-model-create-dialog";
import { VehicleModelEditDialog } from "./vehicle-model-edit-dialog";
import { VehicleModelListDialog } from "./vehicle-model-list-dialog";
import styles from "./vehicle-model-summary-card.module.css";

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");
const PREVIEW_LIMIT = 4;

type CreateVehicleModelAction = (
  previousState: CreateVehicleModelActionState,
  formData: FormData,
) => Promise<CreateVehicleModelActionState>;

type UpdateVehicleModelAction = (
  previousState: UpdateVehicleModelActionState,
  formData: FormData,
) => Promise<UpdateVehicleModelActionState>;

type DeleteVehicleModelAction = (
  previousState: DeleteCatalogEntryActionState,
  formData: FormData,
) => Promise<DeleteCatalogEntryActionState>;

export type VehicleModelSummaryCardProps = {
  vehicleModels: VehicleModel[];
  brands: CatalogEntryView[];
  vehicleTypes: CatalogEntryView[];
  fuelTypes: CatalogEntryView[];
  hasLoadError: boolean;
  hasReferenceLoadError: boolean;
  action: CreateVehicleModelAction;
  updateAction: UpdateVehicleModelAction;
  deleteAction: DeleteVehicleModelAction;
};

type OpenDialog =
  | { type: "none" }
  | { type: "create" }
  | { type: "list" }
  | { type: "edit"; vehicleModel: VehicleModel }
  | { type: "delete"; vehicleModel: VehicleModel };

export function VehicleModelSummaryCard({
  vehicleModels,
  brands,
  vehicleTypes,
  fuelTypes,
  hasLoadError,
  hasReferenceLoadError,
  action,
  updateAction,
  deleteAction,
}: VehicleModelSummaryCardProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>({ type: "none" });
  const inactiveCount = vehicleModels.filter(
    (vehicleModel) => !vehicleModel.isActive,
  ).length;
  const previewModels = vehicleModels.slice(0, PREVIEW_LIMIT);

  function closeDialog() {
    setOpenDialog({ type: "none" });
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
                <ActionButton
                  size="sm"
                  onClick={() => setOpenDialog({ type: "create" })}
                >
                  ایجاد مدل
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpenDialog({ type: "list" })}
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
            open={openDialog.type === "create"}
            onClose={closeDialog}
            brands={brands}
            vehicleTypes={vehicleTypes}
            fuelTypes={fuelTypes}
            hasReferenceLoadError={hasReferenceLoadError}
            action={action}
          />
          <VehicleModelListDialog
            open={openDialog.type === "list"}
            onClose={closeDialog}
            vehicleModels={vehicleModels}
            onEditVehicleModel={(vehicleModel) =>
              setOpenDialog({ type: "edit", vehicleModel })
            }
            onDeleteVehicleModel={(vehicleModel) =>
              setOpenDialog({ type: "delete", vehicleModel })
            }
          />

          {openDialog.type === "edit" && (
            <VehicleModelEditDialog
              key={openDialog.vehicleModel.id}
              open
              onClose={closeDialog}
              vehicleModel={openDialog.vehicleModel}
              brands={brands}
              vehicleTypes={vehicleTypes}
              fuelTypes={fuelTypes}
              hasReferenceLoadError={hasReferenceLoadError}
              action={updateAction}
            />
          )}

          {openDialog.type === "delete" && (
            <CatalogDeleteDialog
              key={openDialog.vehicleModel.id}
              open
              onClose={closeDialog}
              fieldId="vehicle-model"
              title="مدل خودرو"
              entry={openDialog.vehicleModel}
              identityLines={[
                { label: "برند", value: openDialog.vehicleModel.brand.name },
                { label: "دستهٔ اطلاعات پایه", value: "مدل خودرو" },
              ]}
              inUseMessage="این مدل روی خودروهای ثبت‌شده استفاده شده و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید."
              action={deleteAction}
            />
          )}
        </>
      )}
    </section>
  );
}
