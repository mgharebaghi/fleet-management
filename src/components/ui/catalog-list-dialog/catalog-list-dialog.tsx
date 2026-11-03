"use client";

import { StatusBadge } from "../status-badge/status-badge";
import { Dialog } from "../dialog/dialog";
import { DeleteIcon, EditIcon } from "../icon/icons";
import {
  IconActionButton,
  IconActionGroup,
} from "../icon-action-button/icon-action-button";
import { InlineNotice } from "../inline-notice/inline-notice";
import styles from "./catalog-list-dialog.module.css";

export type CatalogEntryView = { id: number; name: string; isActive?: boolean; detail?: string | null };

export type CatalogListDialogProps = {
  open: boolean;
  onClose: () => void;
  fieldId: string;
  title: string;
  entries: CatalogEntryView[];
  emptyStateMessage: string;
  /** Omit to render a read-only list (used where edit/delete aren't wired up yet). */
  onEditEntry?: (entry: CatalogEntryView) => void;
  onDeleteEntry?: (entry: CatalogEntryView) => void;
};

export function CatalogListDialog({
  open,
  onClose,
  fieldId,
  title,
  entries,
  emptyStateMessage,
  onEditEntry,
  onDeleteEntry,
}: CatalogListDialogProps) {
  const titleId = `${fieldId}-list-title`;

  return (
    <Dialog open={open} onClose={onClose} titleId={titleId} title={title} size="list">
      {entries.length === 0 ? (
        <InlineNotice tone="empty">{emptyStateMessage}</InlineNotice>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.entryRow}>
              <span className={styles.entryName}>
                {entry.name}
                {entry.detail && <span className={styles.entryDetail}>{entry.detail}</span>}
                {entry.isActive === false && (
                  <StatusBadge label="غیرفعال" tone="negative" />
                )}
              </span>
              {(onEditEntry || onDeleteEntry) && (
                <span className={styles.entryActions}>
                  <IconActionGroup>
                    {onEditEntry && (
                      <IconActionButton
                        label={`ویرایش ${entry.name}`}
                        icon={<EditIcon />}
                        onClick={() => onEditEntry(entry)}
                      />
                    )}
                    {onDeleteEntry && (
                      <IconActionButton
                        label={`حذف ${entry.name}`}
                        icon={<DeleteIcon />}
                        tone="danger"
                        onClick={() => onDeleteEntry(entry)}
                      />
                    )}
                  </IconActionGroup>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
