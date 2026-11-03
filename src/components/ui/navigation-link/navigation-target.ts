import type { ComponentProps } from "react";
import type Link from "next/link";

export function isPageNavigation(href: ComponentProps<typeof Link>["href"], currentUrl: string): boolean {
  try {
    const current = new URL(currentUrl);
    const target = new URL(typeof href === "string" ? href : href.pathname ?? "", current);
    return target.origin === current.origin && target.pathname !== current.pathname;
  } catch { return false; }
}
