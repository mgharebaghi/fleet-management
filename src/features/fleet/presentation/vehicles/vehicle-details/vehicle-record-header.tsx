import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import type { VehicleDetail } from "../../../application/vehicles/vehicle";
export function VehicleRecordHeader({ vehicle }: { vehicle: VehicleDetail }) {
  return <PageHeader eyebrow="پروندهٔ خودرو" title={vehicle.vehicleCode} description={`${vehicle.brand.name} — ${vehicle.model.name}`} action={<BackLink label="بازگشت به خودروها" href="/fleet/vehicles" />} compactAction />;
}
