import type { ReactNode } from "react";

import styles from "./inline-notice.module.css";

type InlineNoticeProps = {
  /** "empty" states a normal absence of data; the others carry a message. */
  tone: "danger" | "info" | "empty";
  role?: "alert" | "status";
  id?: string;
  children: ReactNode;
};

export function InlineNotice({ tone, role, id, children }: InlineNoticeProps) {
  return (
    <p className={styles[tone]} role={role} id={id}>
      {children}
    </p>
  );
}
