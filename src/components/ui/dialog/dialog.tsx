"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";

import styles from "./dialog.module.css";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "form" | "list" | "wide";
};

export function Dialog({
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
    const previousOverflow = rootElement.style.overflow;
    rootElement.style.overflow = "hidden";
    return () => {
      rootElement.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={
        size === "form"
          ? styles.dialog
          : `${styles.dialog} ${styles[size]}`
      }
      aria-labelledby={titleId}
      aria-describedby={description ? `${titleId}-description` : undefined}
      onClick={handleBackdropClick}
      onClose={onClose}
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
