"use client";

import Link, { useLinkStatus } from "next/link";
import { useLayoutEffect, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { LoadingIndicator } from "../loading-indicator/loading-indicator";
import { isPageNavigation } from "./navigation-target";
import styles from "./navigation-link.module.css";

type NavigationLinkProps = ComponentProps<typeof Link>;

function NavigationPending({ href }: Pick<NavigationLinkProps, "href">) {
  const { pending } = useLinkStatus();
  return <PageNavigationPending href={href} pending={pending} />;
}

export function PageNavigationPending({ href, pending }: Pick<NavigationLinkProps, "href"> & { pending: boolean }) {
  const [surface, setSurface] = useState<{ content: HTMLElement; top: number; left: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!pending || !isPageNavigation(href, window.location.href)) return;
    const content = document.querySelector<HTMLElement>("[data-admin-content]");
    if (!content) return;
    function measure() {
      const bounds = content!.getBoundingClientRect();
      setSurface({ content: content!, top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [pending, href]);

  if (!pending || !surface || typeof window === "undefined" || !isPageNavigation(href, window.location.href)) return null;
  const { content, ...bounds } = surface;
  return createPortal(<div className={styles.overlay} style={bounds} data-route-navigation-loading>
    <LoadingIndicator variant="page" />
  </div>, content);
}

/** Keep Next's navigation, prefetch, cancellation and modified-click semantics. */
export function NavigationLink({ children, href, ...props }: NavigationLinkProps) {
  return <Link {...props} href={href}>{children}<NavigationPending href={href} /></Link>;
}
