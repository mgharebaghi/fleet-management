"use client";
import { useState } from "react";
import { IconActionButton, IconActionGroup, IconActionLink } from "../../../../components/ui/icon-action-button/icon-action-button";
import { DeleteIcon, EditIcon, ViewIcon } from "../../../../components/ui/icon/icons";
import type { MaintenanceTypeListItem } from "../../application/reference-data/maintenance-reference-records";

import { DeleteMaintenanceTypeDialog } from "./delete-maintenance-type-dialog";

export function MaintenanceTypeRowActions({ record }: { record: MaintenanceTypeListItem }) {
  const [open, setOpen] = useState(false);
  return <><IconActionGroup>
    <IconActionLink label={`مشاهده پروندهٔ ${record.name}`} href={`/maintenance/catalogs/${record.id}`} icon={<ViewIcon />} />
    <IconActionLink label={`ویرایش ${record.name}`} href={`/maintenance/catalogs/${record.id}/edit`} icon={<EditIcon />} />
    <IconActionButton label={record.isUsed ? `حذف ${record.name} امکان‌پذیر نیست؛ این نوع تعمیر و سرویس استفاده شده است` : `حذف ${record.name}`} icon={<DeleteIcon />} tone="danger" disabled={record.isUsed} onClick={() => setOpen(true)} />
  </IconActionGroup>{open && <DeleteMaintenanceTypeDialog record={record} onClose={() => setOpen(false)} />}</>;
}
