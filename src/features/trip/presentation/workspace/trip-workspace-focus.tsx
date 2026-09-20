"use client";

import { useEffect } from "react";

import type { WorkspaceSectionId } from "./trip-workspace-view";

export function TripWorkspaceFocus({
  sectionId,
}: {
  sectionId: WorkspaceSectionId;
}) {
  useEffect(() => {
    const panel = document.getElementById(`workspace-tab-${sectionId}`);
    if (!panel) return;
    const target =
      panel.querySelector<HTMLElement>("h2, h3, table, [tabindex]") ?? panel;
    target.focus({ preventScroll: true });
  }, [sectionId]);
  return null;
}
