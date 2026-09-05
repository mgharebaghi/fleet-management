import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "../../../../../components/ui/record-cards/record-cards";
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
        <InlineNotice tone="empty">هنوز مدل خودرویی ثبت نشده است.</InlineNotice>
      ) : (
        <>
          <DataTable caption="فهرست مدل‌های خودرو" minWidth={560}>
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
          </DataTable>

          <RecordCardList>
            {vehicleModels.map((vehicleModel) => (
              <RecordCard key={vehicleModel.id}>
                <RecordCardHeader
                  title={vehicleModel.name}
                  badge={
                    <VehicleModelStatus isActive={vehicleModel.isActive} />
                  }
                />
                <RecordCardDetails>
                  <RecordCardDetail label="برند">
                    {vehicleModel.brand.name}
                  </RecordCardDetail>
                  <RecordCardDetail label="نوع خودرو">
                    {vehicleModel.vehicleType?.name ?? "—"}
                  </RecordCardDetail>
                  <RecordCardDetail label="نوع سوخت">
                    {vehicleModel.fuelType?.name ?? "—"}
                  </RecordCardDetail>
                </RecordCardDetails>
              </RecordCard>
            ))}
          </RecordCardList>
        </>
      )}
    </Dialog>
  );
}
