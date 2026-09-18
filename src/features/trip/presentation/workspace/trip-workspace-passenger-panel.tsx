"use client";

import { useState, type ReactNode } from "react";

import { TripPassengerSwitcher } from "./trip-passenger-switcher";
import styles from "./trip-workspace.module.css";

export function TripWorkspacePassengerPanel({
  items,
  defaultIndex,
  renderPanel,
  ariaLabel,
}: {
  items: { tripId: number; label: string; badge?: string | null }[];
  defaultIndex: number;
  renderPanel: (index: number) => ReactNode;
  ariaLabel?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const safeIndex =
    activeIndex >= 0 && activeIndex < items.length ? activeIndex : 0;
  const active = items[safeIndex];

  return (
    <div className={styles.passengerPanel}>
      <TripPassengerSwitcher
        items={items}
        activeIndex={safeIndex}
        onSelect={setActiveIndex}
        ariaLabel={ariaLabel}
      />
      {active && (
        <div
          role="tabpanel"
          id={`passenger-panel-${active.tripId}`}
          aria-labelledby={`passenger-tab-${active.tripId}`}
          className={styles.passengerPanelBody}
        >
          {renderPanel(safeIndex)}
        </div>
      )}
    </div>
  );
}
