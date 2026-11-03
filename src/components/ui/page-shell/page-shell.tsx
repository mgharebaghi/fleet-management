import type { ReactNode } from "react";
import { FormLayout } from "../form-layout/form-layout";

import styles from "./page-shell.module.css";

type PageShellProps = {
  /** "wide" suits listings, "narrow" keeps a single form column readable. */
  width?: "wide" | "narrow";
  labelledBy?: string;
  children: ReactNode;
};

export function PageShell({
  width = "wide",
  labelledBy,
  children,
}: PageShellProps) {
  return (
    <main className={styles.page} lang="fa" dir="rtl">
      <section
        className={width === "narrow" ? styles.narrowCard : styles.card}
        aria-labelledby={labelledBy}
      >
        {width === "narrow" ? <FormLayout>{children}</FormLayout> : children}
      </section>
    </main>
  );
}
