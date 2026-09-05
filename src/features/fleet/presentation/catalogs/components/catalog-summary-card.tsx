"use client";

import { useState } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { CatalogCreateDialog } from "./catalog-create-dialog";
import { CatalogListDialog } from "./catalog-list-dialog";
import type { CatalogEntryView } from "./catalog-entry-view";
import type { CreateCatalogEntryActionState } from "../create-catalog-entry/create-catalog-entry.action-state";
import styles from "./catalog-summary-card.module.css";

const persianNumberFormatter = new Intl.NumberFormat("fa-IR");

type CreateCatalogEntryAction = (
  previousState: CreateCatalogEntryActionState,
  formData: FormData,
) => Promise<CreateCatalogEntryActionState>;

export type CatalogSummaryCardProps = {
  fieldId: string;
  title: string;
  description: string;
  nameLabel: string;
  submitLabel: string;
  submitPendingLabel: string;
  emptyStateMessage: string;
  duplicateMessage: string;
  entries: CatalogEntryView[];
  hasLoadError: boolean;
  action: CreateCatalogEntryAction;
};

type OpenDialog = "none" | "create" | "list";

export function CatalogSummaryCard({
  fieldId,
  title,
  description,
  nameLabel,
  submitLabel,
  submitPendingLabel,
  emptyStateMessage,
  duplicateMessage,
  entries,
  hasLoadError,
  action,
}: CatalogSummaryCardProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>("none");
  const titleId = `${fieldId}-title`;
  const totalCount = entries.length;
  const inactiveCount = entries.filter(
    (entry) => entry.isActive === false,
  ).length;

  function closeDialog() {
    setOpenDialog("none");
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
            <ActionButton size="sm" onClick={() => setOpenDialog("create")}>
              + افزودن
            </ActionButton>
            {totalCount > 0 && (
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => setOpenDialog("list")}
              >
                مشاهده همه
              </ActionButton>
            )}
          </div>

          <CatalogCreateDialog
            open={openDialog === "create"}
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
            open={openDialog === "list"}
            onClose={closeDialog}
            fieldId={fieldId}
            title={title}
            entries={entries}
            emptyStateMessage={emptyStateMessage}
          />
        </>
      )}
    </section>
  );
}
