"use client";

import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { IconActionButton, IconActionGroup, IconActionLink } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { CheckIcon, DeleteIcon, EditIcon, ViewIcon, WarningIcon } from "../../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import type { Warehouse, WarehouseListItem } from "../../../application/reference-data/inventory-reference-records";
import { deleteWarehouseAction, setWarehouseActiveAction, type WarehouseRowState } from "./warehouse-row.action";

export function WarehouseRowActions({ warehouse }: { warehouse: WarehouseListItem }) {
  const [operation, setOperation] = useState<"delete" | "status" | null>(null);
  return <>
    <IconActionGroup>
      <IconActionLink label={`مشاهده پروندهٔ ${warehouse.name}`} icon={<ViewIcon />} href={`/inventory/warehouses/${warehouse.id}`} />
      <IconActionLink label={`ویرایش ${warehouse.name}`} icon={<EditIcon />} href={`/inventory/warehouses/${warehouse.id}/edit`} />
      <IconActionButton label={`${warehouse.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"} ${warehouse.name}`} icon={warehouse.isActive ? <WarningIcon /> : <CheckIcon />} onClick={() => setOperation("status")} />
      <IconActionButton label={warehouse.hasStockHistory ? `حذف ${warehouse.name} امکان‌پذیر نیست؛ این انبار سابقهٔ گردش دارد` : `حذف ${warehouse.name}`} icon={<DeleteIcon />} tone="danger" disabled={warehouse.hasStockHistory} onClick={() => setOperation("delete")} />
    </IconActionGroup>
    {operation && <WarehouseRowDialog warehouse={warehouse} operation={operation} onClose={() => setOperation(null)} />}
  </>;
}

function WarehouseRowDialog({ warehouse, operation, onClose }: { warehouse: Warehouse; operation: "delete" | "status"; onClose: () => void }) {
  const deleting = operation === "delete";
  const label = deleting ? "حذف انبار" : warehouse.isActive ? "غیرفعال‌سازی انبار" : "فعال‌سازی انبار";
  const [state, action, pending] = useActionState(deleting ? deleteWarehouseAction.bind(null, warehouse.id) : setWarehouseActiveAction.bind(null, warehouse.id, !warehouse.isActive), {} as WarehouseRowState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`warehouse-${operation}-${warehouse.id}`} title={label} recordName={warehouse.name} identityLines={[{ label: "کد انبار", value: warehouse.code }]} message={deleting ? "این انبار حذف شود؟ فقط انبار بدون سابقهٔ گردش قابل حذف است." : warehouse.isActive ? "این انبار غیرفعال شود؟ سوابق حفظ می‌شوند و ثبت گردش جدید برای آن متوقف می‌شود." : "این انبار دوباره فعال شود تا ثبت گردش برای آن امکان‌پذیر باشد؟"}>
    <form action={action} aria-busy={pending}>
      {state.message && <InlineNotice role="alert" tone="danger">{state.message}</InlineNotice>}
      <FormActions separated>
        <ActionButton type="submit" variant={deleting ? "danger" : "primary"} pending={pending}>{pending ? "در حال ثبت…" : deleting ? "حذف" : "تأیید"}</ActionButton>
        <ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton>
      </FormActions>
    </form>
  </ConfirmDialog>;
}
