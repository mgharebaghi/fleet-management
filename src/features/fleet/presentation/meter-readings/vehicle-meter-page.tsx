import { RecordDetailsButton } from "../../../../components/ui/record-details-button/record-details-button";
import { RecordWorkspace } from "../../../../components/ui/record-workspace/record-workspace";
import { VehicleRecordSidebar } from "../vehicles/vehicle-details/vehicle-record-sidebar";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { FormSection } from "../../../../components/ui/form-field/form-field";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../components/ui/record-cards/record-cards";
import { Pagination } from "../../../../components/ui/pagination/pagination";
import { formatDecimalAmount } from "../../../../components/ui/decimal-input/decimal-format";
import { formatDuration } from "../../../../components/ui/duration-input/duration-value";
import { makeGetVehicle } from "../../composition/vehicles/vehicle.factory";
import { makeListVehicleMeters } from "../../composition/meter-readings/vehicle-meter.factory";
import { tehranDateTimeInputs } from "../../../../shared/presentation/tehran-date-time";
import { VehicleRecordHeader } from "../vehicles/vehicle-details/vehicle-record-header";
import { VehicleRecordTabs } from "../vehicles/vehicle-details/vehicle-record-tabs";
import { VehicleMeterFilters } from "./vehicle-meter-filters";
const dateFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" });
export type VehicleMeterSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export async function VehicleMeterPage({ vehicleId, searchParams }: { vehicleId: number; searchParams: VehicleMeterSearchParams }) {
  const field = (name: string) => { const value = searchParams[name]; return (Array.isArray(value) ? value[0] : value) ?? ""; };
  const page = /^\d+$/.test(field("page")) && Number(field("page")) > 0 ? Math.min(Number(field("page")), 1000000) : 1;
  let vehicle, result;
  try { [vehicle, result] = await Promise.all([makeGetVehicle().execute(vehicleId), makeListVehicleMeters().execute(vehicleId, { search: field("search"), page })]); }
  catch { return <PageShell><ResultState variant="error" title="دریافت کارکرد خودرو امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={`/fleet/vehicles/${vehicleId}/meter-readings`}>تلاش دوباره</ActionLink>} /></PageShell>; }
  if (!vehicle) notFound();
  const current = tehranDateTimeInputs(new Date());
  const href = (next: number) => { const query = new URLSearchParams(); for (const [name, value] of Object.entries(searchParams)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(name, item); query.set("page", String(next)); return `/fleet/vehicles/${vehicleId}/meter-readings?${query}`; };
  return <PageShell><VehicleRecordHeader vehicle={vehicle} /><RecordWorkspace><VehicleRecordTabs vehicleId={vehicleId} section="meters">
    <FormSection title="سوابق کارکرد">

      <VehicleMeterFilters search={field("search")} />
      {result.rows.length ? <><DataTable caption="تاریخچهٔ کارکرد خودرو"><thead><tr>{["زمان کارکرد", "کیلومتر", "ساعت کارکرد موتور", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(reading => <tr key={reading.id}><td>{dateFormatter.format(new Date(reading.recordedAt))}</td><td><TechnicalValue>{reading.odometer === null ? "—" : formatDecimalAmount(reading.odometer)}</TechnicalValue></td><td><TechnicalValue>{reading.engineHours === null ? "—" : formatDuration(reading.engineHours)}</TechnicalValue></td><td><RecordDetailsButton title="کارکرد خودرو" fields={[["زمان کارکرد", dateFormatter.format(new Date(reading.recordedAt))], ["کیلومتر", reading.odometer === null ? "—" : formatDecimalAmount(reading.odometer)], ["ساعت کارکرد", reading.engineHours === null ? "—" : formatDuration(reading.engineHours)]]} description={reading.description} /></td></tr>)}</tbody></DataTable>
        <RecordCardList>{result.rows.map(reading => <RecordCard key={reading.id}><RecordCardHeader title={dateFormatter.format(new Date(reading.recordedAt))} /><RecordCardDetails><RecordCardDetail label="کیلومتر"><TechnicalValue>{reading.odometer === null ? "—" : formatDecimalAmount(reading.odometer)}</TechnicalValue></RecordCardDetail><RecordCardDetail label="ساعت کارکرد موتور"><TechnicalValue>{reading.engineHours === null ? "—" : formatDuration(reading.engineHours)}</TechnicalValue></RecordCardDetail><RecordCardDetail label="عملیات"><RecordDetailsButton title="کارکرد خودرو" fields={[["زمان کارکرد", dateFormatter.format(new Date(reading.recordedAt))]]} description={reading.description} /></RecordCardDetail></RecordCardDetails></RecordCard>)}</RecordCardList></> : <ResultState title={field("search") ? "سابقه‌ای مطابق جستجو پیدا نشد" : "هنوز کارکردی ثبت نشده است"} description={field("search") ? "عبارت جستجو را تغییر دهید." : "برای ثبت اولین سابقه، ثبت کارکرد را انتخاب کنید."} />}
      <Pagination label="صفحه‌های کارکرد خودرو" currentPage={page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={href} />
    </FormSection>
  </VehicleRecordTabs><VehicleRecordSidebar vehicle={vehicle} section="meters" meterDefaults={current} /></RecordWorkspace></PageShell>;
}
