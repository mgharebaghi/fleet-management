import type { ReactNode } from "react";
import styles from "./form-layout.module.css";

/** The common content width and section spacing of full-page record forms. */
export function FormLayout({ children }: { children: ReactNode }) {
  return <div className={styles.layout}>{children}</div>;
}
