import type { ReactNode } from "react";
import { RecordTabs } from "../../../../../components/ui/record-tabs/record-tabs";
export function VehicleRecordTabs({ vehicleId, section, children }: { vehicleId: number; section: "details" | "meters"; children: ReactNode }) {
  return <RecordTabs label="بخش‌های پروندهٔ خودرو" active={section} tabs={[{ id: "details", label: "مشخصات خودرو", href: `/fleet/vehicles/${vehicleId}` }, { id: "meters", label: "کارکرد خودرو", href: `/fleet/vehicles/${vehicleId}/meter-readings` }]}>{children}</RecordTabs>;
}
