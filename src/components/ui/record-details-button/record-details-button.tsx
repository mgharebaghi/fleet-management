"use client";
import { useId, useState, type ReactNode } from "react";
import { Dialog } from "../dialog/dialog";
import { IconActionButton } from "../icon-action-button/icon-action-button";
import { ViewIcon } from "../icon/icons";
import { RecordSummary } from "../record-summary/record-summary";
import { FormSection } from "../form-field/form-field";
import styles from "./record-details-button.module.css";

/** Read-only details for child records which are handled inside their parent page. */
export function RecordDetailsButton({ title, fields, description }: { title: string; fields: Array<[string, ReactNode]>; description?: string | null }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return <><IconActionButton label={`جزئیات ${title}`} icon={<ViewIcon />} onClick={() => setOpen(true)} />{open && <Dialog open onClose={() => setOpen(false)} titleId={titleId} title={`جزئیات ${title}`}><FormSection><RecordSummary fields={fields} /></FormSection><FormSection title="توضیحات"><p className={styles.description}>{description || "توضیحی ثبت نشده است."}</p></FormSection></Dialog>}</>;
}
