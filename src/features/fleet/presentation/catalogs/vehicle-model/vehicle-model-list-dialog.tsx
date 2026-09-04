import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import type { VehicleModel } from "../../../application/catalogs/vehicle-model";
import styles from "./vehicle-model-list-dialog.module.css";

export type VehicleModelListDialogProps = {
  open: boolean;
  onClose: () => void;
  vehicleModels: VehicleModel[];
};

function VehicleModelStatus({ isActive }: { isActive: boolean }) {
  return (
    <StatusBadge
      label={isActive ? "فعال" : "غیرفعال"}
      tone={isActive ? "positive" : "negative"}
    />
  );
}

export function VehicleModelListDialog({
  open,
  onClose,
  vehicleModels,
}: VehicleModelListDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="vehicle-model-list-title"
      title="مدل‌های خودرو"
      description="مشخصات پایه و وضعیت همه مدل‌های ثبت‌شده را مشاهده کنید."
      size="wide"
    >
      {vehicleModels.length === 0 ? (
        <p className={styles.emptyState}>
          هنوز مدل خودرویی ثبت نشده است.
        </p>
      ) : (
        <>
          <div className={styles.tableFrame}>
            <table className={styles.table}>
              <caption className={styles.visuallyHidden}>
                فهرست مدل‌های خودرو
              </caption>
              <thead>
                <tr>
                  <th scope="col">نام مدل</th>
                  <th scope="col">برند</th>
                  <th scope="col">نوع خودرو</th>
                  <th scope="col">نوع سوخت</th>
                  <th scope="col">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {vehicleModels.map((vehicleModel) => (
                  <tr key={vehicleModel.id}>
                    <td className={styles.modelName}>{vehicleModel.name}</td>
                    <td>{vehicleModel.brand.name}</td>
                    <td>{vehicleModel.vehicleType?.name ?? "—"}</td>
                    <td>{vehicleModel.fuelType?.name ?? "—"}</td>
                    <td>
                      <VehicleModelStatus isActive={vehicleModel.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={styles.mobileCards}>
            {vehicleModels.map((vehicleModel) => (
              <li key={vehicleModel.id} className={styles.mobileCard}>
                <div className={styles.mobileCardHeader}>
                  <p>{vehicleModel.name}</p>
                  <VehicleModelStatus isActive={vehicleModel.isActive} />
                </div>
                <dl className={styles.details}>
                  <div>
                    <dt>برند</dt>
                    <dd>{vehicleModel.brand.name}</dd>
                  </div>
                  <div>
                    <dt>نوع خودرو</dt>
                    <dd>{vehicleModel.vehicleType?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>نوع سوخت</dt>
                    <dd>{vehicleModel.fuelType?.name ?? "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
