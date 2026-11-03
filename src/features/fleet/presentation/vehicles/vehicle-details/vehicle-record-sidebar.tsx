import { RecordSidePanel } from "../../../../../components/ui/record-workspace/record-workspace";
import { RecordSummary } from "../../../../../components/ui/record-summary/record-summary";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { VehiclePlate } from "../../../../../components/ui/vehicle-plate/vehicle-plate";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { formatDuration } from "../../../../../components/ui/duration-input/duration-value";
import type { VehicleDetail } from "../../../application/vehicles/vehicle";
import { CreateVehicleMeterButton } from "../../meter-readings/vehicle-meter-dialog";
import { DeleteVehicleButton } from "../delete-vehicle/delete-vehicle-button";
import styles from "./vehicle-details-page.module.css";
export function VehicleRecordSidebar({ vehicle, section, meterDefaults }: { vehicle: VehicleDetail; section: "details" | "meters"; meterDefaults?: { day: string; time: string } }) {
  return <RecordSidePanel title="خلاصهٔ خودرو" summary={<div className={styles.line}><StatusBadge label={vehicle.isActive ? "فعال" : "غیرفعال"} tone={vehicle.isActive ? "positive" : "negative"} /><span>{vehicle.status.name}</span></div>}>
    <div className={styles.identity}><VehiclePlate vehicle={vehicle} />{vehicle.internationalPlateNo && <span>پلاک بین‌المللی: <TechnicalValue>{vehicle.internationalPlateNo}</TechnicalValue></span>}</div>
    <section className={styles.operations} aria-label="کارکرد فعلی خودرو"><h3>کارکرد فعلی</h3><RecordSummary fieldClassName={styles.fact} fields={[["کیلومتر", <TechnicalValue key="odometer">{vehicle.currentOdometer === null ? "ثبت نشده" : formatDecimalAmount(vehicle.currentOdometer)}</TechnicalValue>], ["ساعت موتور", <TechnicalValue key="hours">{vehicle.currentEngineHour === null ? "ثبت نشده" : formatDuration(vehicle.currentEngineHour)}</TechnicalValue>]]} /></section>
    <section className={styles.operations} aria-label="عملیات خودرو"><h3>عملیات</h3>{section === "details" ? <><ActionLink variant="primary" href={`/fleet/vehicles/${vehicle.vehicleId}/edit`}>ویرایش اطلاعات</ActionLink><DeleteVehicleButton vehicle={vehicle} /></> : meterDefaults && <CreateVehicleMeterButton vehicleId={vehicle.vehicleId} initialDay={meterDefaults.day} initialTime={meterDefaults.time} />}</section>
  </RecordSidePanel>;
}
