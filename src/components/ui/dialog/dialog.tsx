"use client";

import type { MouseEvent, ReactNode, SyntheticEvent } from "react";
import { useEffect, useRef } from "react";

import styles from "./dialog.module.css";

let openDialogScrollLocks = 0;
let rootOverflowBeforeFirstDialog = "";

export type DialogProps = {
  id?: string;
  className?: string;
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description?: string;
  children: ReactNode;
  /** "drawer" pins the panel to the inline-start edge, full height. */
  size?: "form" | "list" | "wide" | "map" | "drawer";
};

export function Dialog({
  id,
  className,
  open,
  onClose,
  titleId,
  title,
  description,
  children,
  size = "form",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) {
      return;
    }

    if (open && !dialogElement.open) {
      dialogElement.showModal();
    } else if (!open && dialogElement.open) {
      dialogElement.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    // showModal() alone stops pointer/keyboard interaction with the
    // background, but not a wheel/touch scroll of the page behind it.
    // The root <html> element is the page's actual scrolling box here
    // (globals.css sets overflow-x on both html and body, which disables
    // the usual body->viewport overflow propagation), so lock it there.
    const rootElement = document.documentElement;
    const contentElement = document.querySelector("[data-admin-content]");
    if (openDialogScrollLocks === 0) {
      rootOverflowBeforeFirstDialog = rootElement.style.overflow;
      if (contentElement instanceof HTMLElement) {
        contentElement.dataset.scrollLock = contentElement.style.overflow;
      }
    }
    openDialogScrollLocks += 1;
    rootElement.style.overflow = "hidden";
    if (contentElement instanceof HTMLElement) {
      contentElement.style.overflow = "hidden";
    }
    return () => {
      openDialogScrollLocks = Math.max(0, openDialogScrollLocks - 1);
      if (openDialogScrollLocks === 0) {
        rootElement.style.overflow = rootOverflowBeforeFirstDialog;
        if (contentElement instanceof HTMLElement) {
          contentElement.style.overflow = contentElement.dataset.scrollLock ?? "";
          delete contentElement.dataset.scrollLock;
        }
      }
    };
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      event.stopPropagation();
      onClose();
    }
  }

  // <dialog> fires "close" for programmatic close() too, so reporting every
  // one of them back as onClose would let a dialog that is closing because
  // the caller already moved on (opening another dialog, say) overwrite that
  // newer state. Only a close the caller did not ask for — Escape — is news.
  // When nested dialogs close, their synthetic close event must not bubble up
  // to parent dialogs.
  function handleNativeClose(event: SyntheticEvent<HTMLDialogElement>) {
    event.stopPropagation();
    if (event.target !== dialogRef.current) {
      return;
    }
    if (open) {
      onClose();
    }
  }

  return (
    <dialog
      id={id}
      ref={dialogRef}
      className={[
        styles.dialog,
        size !== "form" && styles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={titleId}
      aria-describedby={description ? `${titleId}-description` : undefined}
      onClick={handleBackdropClick}
      onClose={handleNativeClose}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={`${titleId}-description`}>{description}</p>}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className={styles.visuallyHidden}>بستن</span>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
