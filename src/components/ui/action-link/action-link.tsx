"use client";

import { useLinkStatus } from "next/link";
import { NavigationLink as Link } from "../navigation-link/navigation-link";
import { isPageNavigation } from "../navigation-link/navigation-target";
import type { ReactNode } from "react";
import { LoadingIndicator } from "../loading-indicator/loading-indicator";

import styles from "./action-link.module.css";

type ActionLinkVariant = "primary" | "secondary" | "quiet";
type ActionLinkSize = "sm" | "md";

type ActionLinkProps = {
  href: string;
  variant?: ActionLinkVariant;
  size?: ActionLinkSize;
  rel?: string;
  onNavigate?: () => void;
  children: ReactNode;
};

/** Query-only changes retain their local hint; page changes use NavigationLink. */
function LinkPendingHint({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  const showHint = pending && typeof window !== "undefined" && !isPageNavigation(href, window.location.href);
  return (<>
    <span
      aria-hidden="true"
      className={styles.pendingHint}
    />
    {showHint && <LoadingIndicator scope="results" />}
  </>);
}

export function ActionLink({
  href,
  variant = "secondary",
  size = "md",
  rel,
  onNavigate,
  children,
}: ActionLinkProps) {
  return (
    <Link
      className={`${styles[variant]} ${styles[size]}`}
      href={href}
      rel={rel}
      onNavigate={onNavigate}
    >
      {children}
      <LinkPendingHint href={href} />
    </Link>
  );
}
