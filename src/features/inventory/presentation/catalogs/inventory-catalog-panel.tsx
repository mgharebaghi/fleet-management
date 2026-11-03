"use client";
import { useInventoryFormState } from "../use-inventory-form-state";

import { useEffect, useState } from "react";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { CatalogPanel } from "../../../../components/ui/catalog-panel/catalog-panel";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmedSubmitButton } from "../../../../components/ui/confirmed-submit/confirmed-submit-button";
import { CatalogListDialog } from "../../../../components/ui/catalog-list-dialog/catalog-list-dialog";
import { Dialog } from "../../../../components/ui/dialog/dialog";
import { FieldErrors, FieldLabel, FormActions, FormField, formControlClassName } from "../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import type { InventoryUnit, PartCategory } from "../../application/reference-data/inventory-reference-records";
import { deleteInventoryUnitAction, deletePartCategoryAction, saveInventoryUnitAction, savePartCategoryAction } from "./inventory-catalog.actions";
import { initialInventoryReferenceFormState } from "../shared/inventory-reference-form-state";
import { inventoryReferenceFieldErrors, inventoryReferenceStatusMessage } from "../shared/inventory-reference-messages";
import styles from "../shared/inventory-reference-forms.module.css";

type Entry = InventoryUnit | PartCategory;
type Props = { hasLoadError?: boolean } & (
  | { kind: "unit"; entries: InventoryUnit[] }
  | { kind: "category"; entries: PartCategory[] }
);
type OpenCatalogDialog = { type: "none" | "create" | "list" } | { type: "edit" | "delete"; entry: Entry };

function CatalogEntryForm({ kind, entry, onClose }: { kind: Props["kind"]; entry?: Entry; onClose: () => void }) {
  const action = (kind === "unit" ? saveInventoryUnitAction : savePartCategoryAction).bind(null, entry?.id ?? null);
  const [state, submit, pending, stateInput] = useInventoryFormState(action, initialInventoryReferenceFormState);
  const [name, setName] = useState(entry?.name ?? "");
  const [symbol, setSymbol] = useState(entry && "symbol" in entry ? entry.symbol ?? "" : "");
  const [isActive, setActive] = useState(entry && "isActive" in entry ? entry.isActive : true);
  const singular = kind === "unit" ? "واحد شمارش" : "دسته‌بندی قطعات";
  const formId = `inventory-${kind}-form`;
  const status = inventoryReferenceStatusMessage(state);
  useEffect(() => { if (state.status === "saved" && !pending) onClose(); }, [state, pending, onClose]);

  return <Dialog open onClose={() => { if (!pending) onClose(); }} titleId={`${formId}-title`} title={`${entry ? "ویرایش" : "افزودن"} ${singular}`}>
    <form id={formId} action={submit} onInputCapture={stateInput} noValidate aria-busy={pending} className={styles.form}>
      <FormField>
        <FieldLabel htmlFor={`${formId}-name`} required>{kind === "unit" ? "نام واحد" : "نام دسته‌بندی"}</FieldLabel>
        <input id={`${formId}-name`} name="name" className={formControlClassName} value={name} onChange={event => setName(event.target.value)} disabled={pending} required autoFocus aria-invalid={inventoryReferenceFieldErrors(state, "name").length > 0} aria-describedby={`${formId}-name-error`} />
        <FieldErrors id={`${formId}-name-error`} messages={inventoryReferenceFieldErrors(state, "name")} />
      </FormField>
      {kind === "unit" && <FormField>
        <FieldLabel htmlFor={`${formId}-symbol`}>نماد واحد</FieldLabel>
        <input id={`${formId}-symbol`} name="symbol" className={formControlClassName} value={symbol} onChange={event => setSymbol(event.target.value)} disabled={pending} aria-invalid={inventoryReferenceFieldErrors(state, "symbol").length > 0} aria-describedby={`${formId}-symbol-error`} />
        <FieldErrors id={`${formId}-symbol-error`} messages={inventoryReferenceFieldErrors(state, "symbol")} />
      </FormField>}
      {kind === "category" && entry && <FormField>
        <label><input type="checkbox" name="isActive" checked={isActive} onChange={event => setActive(event.target.checked)} disabled={pending} /> فعال</label>
      </FormField>}
      {status && <InlineNotice tone="danger" role="alert">{status}</InlineNotice>}
      <FormActions separated>
        {entry ? <ConfirmedSubmitButton formId={formId} titleId={`${formId}-confirm`} dialogTitle="ذخیره تغییرات" recordName={entry.name} message="تغییرات این مورد ذخیره شود؟" label="ذخیره تغییرات" pendingLabel="در حال ذخیره…" confirmLabel="تأیید و ذخیره" pending={pending} size="sm" />
          : <ActionButton type="submit" size="sm" pending={pending}>{pending ? "در حال ثبت…" : "ثبت"}</ActionButton>}
        <ActionButton variant="secondary" size="sm" disabled={pending} onClick={onClose}>انصراف</ActionButton>
      </FormActions>
    </form>
  </Dialog>;
}

function InventoryCatalogDeleteDialog({ kind, entry, onClose }: { kind: Props["kind"]; entry: Entry; onClose: () => void }) {
  const [state, submit, pending, stateInput] = useInventoryFormState((kind === "unit" ? deleteInventoryUnitAction : deletePartCategoryAction).bind(null, entry.id), initialInventoryReferenceFormState);
  const message = inventoryReferenceStatusMessage(state);
  useEffect(() => { if (state.status === "saved" && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`inventory-${kind}-delete-title`} title={kind === "unit" ? "حذف واحد شمارش" : "حذف دسته‌بندی قطعات"} recordName={entry.name} message="این مورد حذف شود؟ اطلاعات پایه‌ای که برای قطعات استفاده شده باشد قابل حذف نیست.">
    <form action={submit} onInputCapture={stateInput} aria-busy={pending}>
      {message && <InlineNotice tone="danger" role="alert">{message}</InlineNotice>}
      <FormActions separated>
        <ActionButton type="submit" variant="danger" size="sm" pending={pending}>{pending ? "در حال حذف…" : "حذف"}</ActionButton>
        <ActionButton variant="secondary" size="sm" disabled={pending} onClick={onClose}>انصراف</ActionButton>
      </FormActions>
    </form>
  </ConfirmDialog>;
}

export function InventoryCatalogPanel({ kind, entries, hasLoadError = false }: Props) {
  const [dialog, setDialog] = useState<OpenCatalogDialog>({ type: "none" });
  const title = kind === "unit" ? "واحدهای شمارش" : "دسته‌بندی قطعات";
  const close = () => setDialog({ type: "none" });
  return <CatalogPanel titleId={`inventory-${kind}-title`} title={title}
    description={kind === "unit" ? "واحدهایی مانند عدد، لیتر و کیلوگرم را متناسب با قطعات خود تعریف کنید." : "قطعات را برای انتخاب و پیگیری آسان‌تر دسته‌بندی کنید."}
    count={hasLoadError ? undefined : entries.length} inactiveCount={entries.filter(entry => "isActive" in entry && !entry.isActive).length}
    actions={hasLoadError ? undefined : <>
      <ActionButton size="sm" onClick={() => setDialog({ type: "create" })}>+ افزودن</ActionButton>
      {entries.length > 0 && <ActionButton size="sm" variant="secondary" onClick={() => setDialog({ type: "list" })}>مشاهده همه</ActionButton>}
    </>}
  >
    {hasLoadError && <InlineNotice tone="danger" role="alert">دریافت فهرست امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.</InlineNotice>}
    {dialog.type === "create" && <CatalogEntryForm kind={kind} onClose={close} />}
    {dialog.type === "edit" && <CatalogEntryForm key={dialog.entry.id} kind={kind} entry={dialog.entry} onClose={close} />}
    {dialog.type === "delete" && <InventoryCatalogDeleteDialog kind={kind} entry={dialog.entry} onClose={close} />}
    {dialog.type === "list" && <CatalogListDialog open onClose={close} fieldId={`inventory-${kind}`} title={title}
      entries={entries.map(entry => ({ ...entry, detail: "symbol" in entry && entry.symbol ? `نماد: ${entry.symbol}` : null }))}
      emptyStateMessage="هنوز موردی ثبت نشده است."
      onEditEntry={selected => { const entry = entries.find(item => item.id === selected.id); if (entry) setDialog({ type: "edit", entry }); }}
      onDeleteEntry={selected => { const entry = entries.find(item => item.id === selected.id); if (entry) setDialog({ type: "delete", entry }); }}
    />}
  </CatalogPanel>;
}
