"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./loading-indicator.module.css";

export function ScopedLoading({ children, scope }: { children: ReactNode; scope: "panel" | "results" }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [surface, setSurface] = useState<{ target: HTMLElement; top: number; left: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const panel = anchor.current?.closest<HTMLElement>("[data-loading-panel], form, main > section");
    if (!panel) return;
    const regions = scope === "results" ? [...panel.querySelectorAll<HTMLElement>("[data-loading-results]")] : [];
    function measure() {
      const target = regions.find(region => region.getBoundingClientRect().height > 0) ?? panel!;
      const bounds = target.getBoundingClientRect();
      const viewport = document.querySelector("[data-admin-content]")?.getBoundingClientRect();
      const top = Math.max(bounds.top, viewport?.top ?? 0, 0);
      const left = Math.max(bounds.left, viewport?.left ?? 0, 0);
      const bottom = Math.min(bounds.bottom, viewport?.bottom ?? window.innerHeight, window.innerHeight);
      const right = Math.min(bounds.right, viewport?.right ?? window.innerWidth, window.innerWidth);
      setSurface({ target, top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [scope]);
  const { target, ...bounds } = surface ?? {};
  return <><span hidden ref={anchor} />{target ? createPortal(<div className={styles.scopedOverlay} style={bounds} data-scoped-loading>{children}</div>, target) : children}</>;
}
