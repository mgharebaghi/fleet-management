"use client";

import { useState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { CatalogCreateDialog } from "./catalog-create-dialog";
import { CatalogDeleteDialog } from "./catalog-delete-dialog";
import { CatalogEditDialog } from "./catalog-edit-dialog";
import { CatalogListDialog } from "./catalog-list-dialog";
import type { CatalogEntryView } from "./catalog-entry-view";
import type { CreateCatalogEntryActionState } from "../create-catalog-entry/create-catalog-entry.action-state";
import type { DeleteCatalogEntryActionState } from "../delete-catalog-entry/delete-catalog-entry.action-state";
import type { UpdateCatalogEntryActionState } from "../update-catalog-entry/update-catalog-entry.action-state";
import styles from "./catalog-summary-card.module.css";

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");

type CreateCatalogEntryAction = (
  previousState: CreateCatalogEntryActionState,
  formData: FormData,
) => Promise<CreateCatalogEntryActionState>;

type UpdateCatalogEntryAction = (
  previousState: UpdateCatalogEntryActionState,
  formData: FormData,
) => Promise<UpdateCatalogEntryActionState>;

type DeleteCatalogEntryAction = (
  previousState: DeleteCatalogEntryActionState,
  formData: FormData,
) => Promise<DeleteCatalogEntryActionState>;

export type CatalogSummaryCardProps = {
  fieldId: string;
  title: string;
  description: string;
  nameLabel: string;
  submitLabel: string;
  submitPendingLabel: string;
  emptyStateMessage: string;
  duplicateMessage: string;
  /** Persian explanation shown when a delete is rejected by a foreign key. */
  inUseMessage: string;
  /** false for catalogs (like VehicleStatus) with no IsActive column. */
  supportsActiveToggle: boolean;
  entries: CatalogEntryView[];
  hasLoadError: boolean;
  action: CreateCatalogEntryAction;
  updateAction: UpdateCatalogEntryAction;
  deleteAction: DeleteCatalogEntryAction;
};

type OpenDialog =
  | { type: "none" }
  | { type: "create" }
  | { type: "list" }
  | { type: "edit"; entry: CatalogEntryView }
  | { type: "delete"; entry: CatalogEntryView };

export function CatalogSummaryCard({
  fieldId,
  title,
  description,
  nameLabel,
  submitLabel,
  submitPendingLabel,
  emptyStateMessage,
  duplicateMessage,
  inUseMessage,
  supportsActiveToggle,
  entries,
  hasLoadError,
  action,
  updateAction,
  deleteAction,
}: CatalogSummaryCardProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>({ type: "none" });
  const titleId = `${fieldId}-title`;
  const totalCount = entries.length;
  const inactiveCount = entries.filter(
    (entry) => entry.isActive === false,
  ).length;

  function closeDialog() {
    setOpenDialog({ type: "none" });
  }

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        {description && <p>{description}</p>}
      </header>

      {hasLoadError ? (
        <InlineNotice tone="danger" role="alert">
          دریافت فهرست امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.
        </InlineNotice>
      ) : (
        <>
          <div className={styles.counts}>
            <p className={styles.count}>
              {persianNumberFormatter.format(totalCount)} مورد ثبت‌شده
            </p>
            {inactiveCount > 0 && (
              <p className={styles.inactiveCount}>
                {persianNumberFormatter.format(inactiveCount)} مورد غیرفعال
              </p>
            )}
          </div>

          <div className={styles.actions}>
            <ActionButton
              size="sm"
              onClick={() => setOpenDialog({ type: "create" })}
            >
              + افزودن
            </ActionButton>
            {totalCount > 0 && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => setOpenDialog({ type: "list" })}
              >
                مشاهده همه
              </ActionButton>
            )}
          </div>

          <CatalogCreateDialog
            open={openDialog.type === "create"}
            onClose={closeDialog}
            fieldId={fieldId}
            title={title}
            nameLabel={nameLabel}
            submitLabel={submitLabel}
            submitPendingLabel={submitPendingLabel}
            duplicateMessage={duplicateMessage}
            action={action}
          />

          <CatalogListDialog
            open={openDialog.type === "list"}
            onClose={closeDialog}
            fieldId={fieldId}
            title={title}
            entries={entries}
            emptyStateMessage={emptyStateMessage}
            onEditEntry={(entry) => setOpenDialog({ type: "edit", entry })}
            onDeleteEntry={(entry) => setOpenDialog({ type: "delete", entry })}
          />

          {openDialog.type === "edit" && (
            <CatalogEditDialog
              key={openDialog.entry.id}
              open
              onClose={closeDialog}
              fieldId={fieldId}
              title={title}
              nameLabel={nameLabel}
              duplicateMessage={duplicateMessage}
              entry={openDialog.entry}
              supportsActiveToggle={supportsActiveToggle}
              action={updateAction}
            />
          )}

          {openDialog.type === "delete" && (
            <CatalogDeleteDialog
              key={openDialog.entry.id}
              open
              onClose={closeDialog}
              fieldId={fieldId}
              title={title}
              entry={openDialog.entry}
              inUseMessage={inUseMessage}
              action={deleteAction}
            />
          )}
        </>
      )}
    </section>
  );
}
