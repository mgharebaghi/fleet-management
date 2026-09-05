import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./action-link.module.css";

type ActionLinkVariant = "primary" | "secondary" | "quiet";

type ActionLinkProps = {
  href: string;
  variant?: ActionLinkVariant;
  rel?: string;
  children: ReactNode;
};

export function ActionLink({
  href,
  variant = "secondary",
  rel,
  children,
}: ActionLinkProps) {
  return (
    <Link className={styles[variant]} href={href} rel={rel}>
      {children}
    </Link>
  );
}
