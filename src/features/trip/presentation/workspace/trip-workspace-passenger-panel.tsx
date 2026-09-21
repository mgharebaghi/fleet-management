"use client";

import { Children, useState, type ReactNode } from "react";

import { TripPassengerSwitcher } from "../passenger/trip-passenger-switcher";
import styles from "./trip-workspace.module.css";

export function TripWorkspacePassengerPanel({
  items,
  defaultIndex,
  children,
  ariaLabel,
}: {
  items: { tripId: number; label: string; badge?: string | null }[];
  defaultIndex: number;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const panels = Children.toArray(children);
  const safeIndex =
    activeIndex >= 0 && activeIndex < items.length ? activeIndex : 0;
  const active = items[safeIndex];
  const activePanel = panels[safeIndex];

  return (
    <div className={styles.passengerPanel}>
      {items.length > 1 && (
        <TripPassengerSwitcher
          passengerCount={items.length}
          activeIndex={safeIndex}
          onSelect={setActiveIndex}
          tabLabel={(index) => items[index]?.label ?? `مسافر ${index + 1}`}
          tabBadge={(index) => items[index]?.badge}
          tabId={(index) => {
            const tripId = items[index]?.tripId;
            return tripId !== undefined ? `passenger-tab-${tripId}` : undefined;
          }}
          tabPanelId={(index) => {
            const tripId = items[index]?.tripId;
            return tripId !== undefined ? `passenger-panel-${tripId}` : undefined;
          }}
          ariaLabel={ariaLabel}
        />
      )}
      {active && activePanel && (
        <div
          role={items.length > 1 ? "tabpanel" : undefined}
          id={`passenger-panel-${active.tripId}`}
          aria-labelledby={
            items.length > 1 ? `passenger-tab-${active.tripId}` : undefined
          }
          className={styles.passengerPanelBody}
        >
          {activePanel}
        </div>
      )}
    </div>
  );
}
