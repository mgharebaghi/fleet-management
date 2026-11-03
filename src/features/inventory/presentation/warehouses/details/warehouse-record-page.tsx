import { notFound } from "next/navigation";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { FormActions, FormSection } from "../../../../../components/ui/form-field/form-field";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { makeReadInventoryReferences } from "../../../composition/inventory-reference.factory";
import { WarehouseForm } from "../form/warehouse-form";

export async function WarehouseRecordPage({ warehouseId, edit = false }: { warehouseId: number; edit?: boolean }) {
  const warehouse = await makeReadInventoryReferences().warehouse(warehouseId);
  if (!warehouse) notFound();
  return <PageShell width={edit ? "narrow" : "wide"}>
    <PageHeader eyebrow="قطعات و انبار" title={edit ? "ویرایش انبار" : warehouse.name} description={<span>کد انبار: <TechnicalValue>{warehouse.code}</TechnicalValue></span>} action={<BackLink label="بازگشت به انبارها" href="/inventory/warehouses" />} compactAction />
    {edit ? <WarehouseForm warehouse={warehouse} /> : <>
      <FormSection title="نشانی یا محل انبار" aside={<StatusBadge label={warehouse.isActive ? "فعال" : "غیرفعال"} tone={warehouse.isActive ? "positive" : "negative"} />}>
        <p>{warehouse.location ?? "نشانی یا محل انبار ثبت نشده است."}</p>
      </FormSection>
      <FormActions separated><ActionLink href={`/inventory/warehouses/${warehouse.id}/edit`} variant="primary">ویرایش انبار</ActionLink><ActionLink href={`/inventory/stock?warehouseId=${warehouse.id}`}>موجودی این انبار</ActionLink><ActionLink href={`/inventory/movements?warehouseId=${warehouse.id}`}>گردش این انبار</ActionLink></FormActions>
    </>}
  </PageShell>;
}
