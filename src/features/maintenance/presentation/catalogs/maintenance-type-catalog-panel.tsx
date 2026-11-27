"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { CatalogListDialog } from "../../../../components/ui/catalog-list-dialog/catalog-list-dialog";
import { CatalogPanel } from "../../../../components/ui/catalog-panel/catalog-panel";
import { ConfirmedSubmitButton } from "../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import { FormActions, FormField } from "../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import type { MaintenanceTypeListItem } from "../../application/reference-data/maintenance-reference-records";
import { MaintenanceFormFeedback, MaintenanceTextField } from "../shared/form/maintenance-form-fields";
import { useMaintenanceFormState } from "../shared/form/use-maintenance-form-state";
import { DeleteMaintenanceTypeDialog } from "../types/delete-maintenance-type-dialog";
import { saveMaintenanceTypeFromCatalogAction } from "../types/save-maintenance-type.action";
import styles from "../shared/form/maintenance-forms.module.css";

const title = "انواع تعمیر و سرویس";
type CatalogDialog = { kind: "create" | "list" } | { kind: "edit" | "delete"; entry: MaintenanceTypeListItem };

function MaintenanceTypeCatalogFormDialog({ record, onClose }: { record?: MaintenanceTypeListItem; onClose: () => void }) {
  const [state, submit, pending, onInput, result] = useMaintenanceFormState(saveMaintenanceTypeFromCatalogAction.bind(null, record?.id ?? null));
  const [code, setCode] = useState(record?.code ?? "");
  const [name, setName] = useState(record?.name ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [isActive, setActive] = useState(record?.isActive ?? true);
  const formId = "maintenance-catalog-type-form";

  useEffect(() => { if ("saved" in result && result.saved === true && !pending) onClose(); }, [result, pending, onClose]);

  return <Dialog open onClose={() => { if (!pending) onClose(); }}
    titleId={record ? "maintenance-catalog-edit-title" : "maintenance-catalog-create-title"}
    title={record ? "ویرایش نوع تعمیر و سرویس" : "افزودن نوع تعمیر و سرویس"}>
    <form id={formId} action={submit} onInputCapture={onInput} noValidate aria-busy={pending} className={styles.form}>
      <MaintenanceTextField name="code" label="کد نوع تعمیر و سرویس" value={code} onChange={setCode} state={state} disabled={pending} required ltr />
      <MaintenanceTextField name="name" label="عنوان نوع تعمیر و سرویس" value={name} onChange={setName} state={state} disabled={pending} required />
      <MaintenanceTextField name="description" label="توضیحات" value={description} onChange={setDescription} state={state} disabled={pending} rows={3} />
      {record && <FormField><label><input type="checkbox" name="isActive" checked={isActive} onChange={event => setActive(event.target.checked)} disabled={pending} /> نوع تعمیر و سرویس فعال است</label></FormField>}
      <MaintenanceFormFeedback state={state} />
      <FormActions separated>
        {record ? <ConfirmedSubmitButton formId={formId} titleId={`${formId}-confirm`} dialogTitle="ذخیره تغییرات" recordName={record.name} message="تغییرات این مورد ذخیره شود؟" label="ذخیره تغییرات" pendingLabel="در حال ذخیره…" confirmLabel="تأیید و ذخیره" pending={pending} size="sm" />
          : <ActionButton type="submit" size="sm" pending={pending}>{pending ? "در حال ثبت…" : "ثبت"}</ActionButton>}
        <ActionButton variant="secondary" size="sm" disabled={pending} onClick={onClose}>انصراف</ActionButton>
      </FormActions>
    </form>
  </Dialog>;
}

export function MaintenanceTypeCatalogPanel({ entries }: { entries: MaintenanceTypeListItem[] | null }) {
  const [dialog, setDialog] = useState<CatalogDialog | null>(null);
  const close = useCallback(() => setDialog(null), []);
  const showList = useCallback(() => setDialog({ kind: "list" }), []);
  return <CatalogPanel titleId="maintenance-catalog-types" title={title}
    description="نوع کارهایی را تعریف کنید که در درخواست‌ها، پرونده‌ها و برنامه‌های سرویس انتخاب می‌شوند."
    count={entries?.length}
    inactiveCount={entries?.filter(entry => !entry.isActive).length}
    actions={entries && <>
      <ActionButton size="sm" onClick={() => setDialog({ kind: "create" })}>+ افزودن</ActionButton>
      {entries.length > 0 && <ActionButton size="sm" variant="secondary" onClick={showList}>مشاهده همه</ActionButton>}
    </>}
  >
    {!entries && <InlineNotice tone="danger" role="alert">دریافت فهرست امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.</InlineNotice>}
    {dialog?.kind === "create" && <MaintenanceTypeCatalogFormDialog onClose={close} />}
    {dialog?.kind === "list" && entries && <CatalogListDialog open onClose={close} fieldId="maintenance-catalog-types" title={title}
      entries={entries.map(({ id, name, isActive, code, isUsed }) => ({
        id, name, isActive, detail: `کد: ${code}`,
        deleteDisabledReason: isUsed ? `حذف ${name} امکان‌پذیر نیست؛ این نوع تعمیر و سرویس استفاده شده است` : undefined,
      }))}
      emptyStateMessage="هنوز موردی ثبت نشده است."
      onEditEntry={({ id }) => {
        const entry = entries.find(item => item.id === id);
        if (entry) setDialog({ kind: "edit", entry });
      }}
      onDeleteEntry={({ id }) => {
        const entry = entries.find(item => item.id === id);
        if (entry && !entry.isUsed) setDialog({ kind: "delete", entry });
      }}
    />}
    {dialog?.kind === "edit" && <MaintenanceTypeCatalogFormDialog record={dialog.entry} onClose={showList} />}
    {dialog?.kind === "delete" && <DeleteMaintenanceTypeDialog record={dialog.entry} onClose={showList} />}
  </CatalogPanel>;
}
