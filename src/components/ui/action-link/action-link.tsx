"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

import styles from "./action-link.module.css";

type ActionLinkVariant = "primary" | "secondary" | "quiet";
type ActionLinkSize = "sm" | "md";

type ActionLinkProps = {
  href: string;
  variant?: ActionLinkVariant;
  size?: ActionLinkSize;
  rel?: string;
  children: ReactNode;
};

/**
 * A link whose target stays on the current page (pagination, "clear
 * filters") never suspends the shared route loading.tsx — React keeps the
 * already-revealed listing on screen instead, so nothing else signals that a
 * new result set is on the way. This decorative hint fills that gap; a link
 * to a different route is normally covered by loading.tsx already, so the
 * hint mostly resolves before it would even become visible there.
 */
function LinkPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`${styles.pendingHint} ${pending ? styles.pendingHintVisible : ""}`}
    />
  );
}

export function ActionLink({
  href,
  variant = "secondary",
  size = "md",
  rel,
  children,
}: ActionLinkProps) {
  return (
    <Link
      className={`${styles[variant]} ${styles[size]}`}
      href={href}
      rel={rel}
    >
      {children}
      <LinkPendingHint />
    </Link>
  );
}
