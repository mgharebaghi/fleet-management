import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import type { CatalogEntryView } from "./catalog-entry-view";
import styles from "./catalog-list-dialog.module.css";

export type CatalogListDialogProps = {
  open: boolean;
  onClose: () => void;
  fieldId: string;
  title: string;
  entries: CatalogEntryView[];
  emptyStateMessage: string;
};

export function CatalogListDialog({
  open,
  onClose,
  fieldId,
  title,
  entries,
  emptyStateMessage,
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
              <span>{entry.name}</span>
              {entry.isActive === false && (
                <StatusBadge label="غیرفعال" tone="negative" />
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
