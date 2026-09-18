"use client";

import { useEffect } from "react";

import type { WorkspaceSectionId } from "./trip-workspace-view";

export function TripWorkspaceFocus({
  sectionId,
  disclosure,
}: {
  sectionId: WorkspaceSectionId;
  disclosure?: "details" | "route" | "survey";
}) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    if (disclosure) {
      const target = section.querySelector<HTMLDetailsElement>(
        `details[data-workspace-disclosure="${disclosure}"]`,
      );
      if (target) target.open = true;
    }
    section.scrollIntoView({ block: "start" });
    section.querySelector<HTMLElement>("h2")?.focus();
  }, [sectionId, disclosure]);
  return null;
}
