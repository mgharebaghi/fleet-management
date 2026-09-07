import { notFound } from "next/navigation";

import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { makeGetVehicle } from "../../../composition/vehicles/vehicle.factory";
import { VehiclePlate } from "../list-vehicles/vehicle-plate";
import { DeleteVehicleButton } from "../delete-vehicle/delete-vehicle-button";
import styles from "./vehicle-details-page.module.css";

const dayFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  dateStyle: "medium",
});

function formatDay(date: Date | null): string {
  return date ? dayFormatter.format(date) : "ثبت نشده";
}

export async function VehicleDetailsPage({ vehicleId }: { vehicleId: number }) {
  const vehicle = await makeGetVehicle().execute(vehicleId);
  if (!vehicle) {
    notFound();
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="پروندهٔ خودرو"
        title={vehicle.vehicleCode}
        action={
          <BackLink label="بازگشت به خودروها" href="/fleet/vehicles" />
        }
        compactAction
        description={
          <span className={styles.identityMeta}>
            <span className={styles.identityBadges}>
              <StatusBadge
                tone={vehicle.isActive ? "positive" : "negative"}
                label={vehicle.isActive ? "فعال" : "غیرفعال"}
              />
              <span className={styles.operationalStatus}>
                {vehicle.status.name}
              </span>
            </span>
            <span>
              {vehicle.brand.name} — {vehicle.model.name}
            </span>
          </span>
        }
      />

      <div className={styles.plateRow}>
        <VehiclePlate vehicle={vehicle} />
        {vehicle.internationalPlateNo && (
          <span className={styles.secondaryValue}>
            پلاک بین‌المللی: <TechnicalValue>{vehicle.internationalPlateNo}</TechnicalValue>
          </span>
        )}
      </div>

      <dl className={styles.details}>
        <div>
          <dt>نوع خودرو</dt>
          <dd>{vehicle.vehicleType?.name ?? "—"}</dd>
        </div>
        <div>
          <dt>نوع سوخت</dt>
          <dd>{vehicle.fuelType?.name ?? "—"}</dd>
        </div>
        <div>
          <dt>سال ساخت</dt>
          <dd>
            <TechnicalValue>{vehicle.modelYear ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>شناسه VIN</dt>
          <dd>
            <TechnicalValue>{vehicle.vin ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>شماره موتور</dt>
          <dd>
            <TechnicalValue>{vehicle.engineNo ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>شماره شاسی</dt>
          <dd>
            <TechnicalValue>{vehicle.chassisNo ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>تاریخ خرید</dt>
          <dd>{formatDay(vehicle.purchaseDate)}</dd>
        </div>
        <div>
          <dt>قیمت خرید</dt>
          <dd>
            <TechnicalValue>{vehicle.purchasePrice ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>کیلومتر فعلی</dt>
          <dd>
            <TechnicalValue>{vehicle.currentOdometer ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>ساعت موتور</dt>
          <dd>
            <TechnicalValue>{vehicle.currentEngineHour ?? "—"}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>تاریخ ثبت</dt>
          <dd>{formatDay(vehicle.createdAt)}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <ActionLink href={`/fleet/vehicles/${vehicle.vehicleId}/edit`} variant="primary">
          ویرایش اطلاعات
        </ActionLink>
        <DeleteVehicleButton vehicle={vehicle} />
      </div>
    </PageShell>
  );
}
