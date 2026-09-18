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
    panel.querySelector<HTMLElement>("h2, h3")?.focus({ preventScroll: true });
  }, [sectionId]);
  return null;
}
