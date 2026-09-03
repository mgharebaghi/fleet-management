import type { ReactNode } from "react";

import styles from "./technical-value.module.css";

type TechnicalValueProps = {
  children: ReactNode;
};

export function TechnicalValue({ children }: TechnicalValueProps) {
  return (
    <span className={styles.value} dir="ltr">
      {children}
    </span>
  );
}
