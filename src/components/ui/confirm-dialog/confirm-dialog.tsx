import type { ReactNode } from "react";

import { Dialog } from "../dialog/dialog";
import { WarningIcon } from "../icon/icons";
import styles from "./confirm-dialog.module.css";

export type ConfirmDialogIdentityLine = {
  label: string;
  value: ReactNode;
};

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  /** "danger" marks an irreversible action; "primary" a routine confirmation. */
  tone?: "danger" | "primary";
  /**
   * The record's human-readable name, shown before anything technical so the
   * user recognises what they are about to act on. Never a database id.
   */
  recordName: ReactNode;
  /** Optional identifying details, shown under the name to tell alike records apart. */
  identityLines?: ConfirmDialogIdentityLine[];
  /** The Persian question and any consequence the user has to weigh. */
  message: ReactNode;
  /** The form carrying the confirm/cancel controls, plus any failure notice. */
  children: ReactNode;
};

/**
 * The shared confirmation layout: a toned mark, the subject's identity, the
 * question, and the caller's own controls. It only arranges what it is given —
 * every word, and the action behind the confirm button, stays with the feature.
 */
export function ConfirmDialog({
  open,
  onClose,
  titleId,
  title,
  tone = "danger",
  recordName,
  identityLines,
  message,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} titleId={titleId} title={title}>
      <div className={styles.body}>
        <div className={`${styles.mark} ${styles[tone]}`} aria-hidden="true">
          <WarningIcon size={22} />
        </div>

        <div className={styles.copy}>
          <p className={styles.recordName}>{recordName}</p>

          {identityLines && identityLines.length > 0 && (
            <dl className={styles.identity}>
              {identityLines.map((line) => (
                <div key={line.label} className={styles.identityLine}>
                  <dt>{line.label}</dt>
                  <dd>{line.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className={styles.message}>{message}</p>
        </div>
      </div>

      {children}
    </Dialog>
  );
}
