import { notFound } from "next/navigation";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { FormSection } from "../../../../../components/ui/form-field/form-field";
import { RecordWorkspace } from "../../../../../components/ui/record-workspace/record-workspace";
import { RecordSummary } from "../../../../../components/ui/record-summary/record-summary";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { makeGetVehicle } from "../../../composition/vehicles/vehicle.factory";
import { VehicleRecordHeader } from "./vehicle-record-header";
import { VehicleRecordTabs } from "./vehicle-record-tabs";
import { VehicleRecordSidebar } from "./vehicle-record-sidebar";
import styles from "./vehicle-details-page.module.css";
const dayFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", dateStyle: "medium" });
const formatDay = (date: Date | null) => date ? dayFormatter.format(date) : "ثبت نشده";
export async function VehicleDetailsPage({ vehicleId }: { vehicleId: number }) {
  const vehicle = await makeGetVehicle().execute(vehicleId);
  if (!vehicle) notFound();
  return <PageShell><VehicleRecordHeader vehicle={vehicle} /><RecordWorkspace>
    <VehicleRecordTabs vehicleId={vehicleId} section="details"><FormSection title="مشخصات خودرو"><RecordSummary fieldClassName={styles.fact} fields={[
      ["نوع خودرو", vehicle.vehicleType?.name ?? "—"], ["نوع سوخت", vehicle.fuelType?.name ?? "—"],
      ["سال ساخت", <TechnicalValue key="year">{vehicle.modelYear ?? "—"}</TechnicalValue>], ["شناسه VIN", <TechnicalValue key="vin">{vehicle.vin ?? "—"}</TechnicalValue>],
      ["شماره موتور", <TechnicalValue key="engine">{vehicle.engineNo ?? "—"}</TechnicalValue>], ["شماره شاسی", <TechnicalValue key="chassis">{vehicle.chassisNo ?? "—"}</TechnicalValue>],
      ["تاریخ خرید", formatDay(vehicle.purchaseDate)], ["قیمت خرید", vehicle.purchasePrice === null ? "ثبت نشده" : <><TechnicalValue key="price">{formatDecimalAmount(vehicle.purchasePrice)}</TechnicalValue> تومان</>],
      ["تاریخ ثبت", formatDay(vehicle.createdAt)],
    ]} /></FormSection></VehicleRecordTabs>
    <VehicleRecordSidebar vehicle={vehicle} section="details" />
  </RecordWorkspace></PageShell>;
}
