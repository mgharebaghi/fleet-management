"use client";

import styles from "./trip-workspace.module.css";

export type TripPassengerSwitcherItem = {
  tripId: number;
  label: string;
  badge?: string | null;
};

/**
 * Tablist for switching the single mounted passenger panel in workspace tabs.
 * API aligned with Worker A `trip-passenger-switcher.tsx` for later consolidation.
 */
export function TripPassengerSwitcher({
  items,
  activeIndex,
  onSelect,
  ariaLabel = "انتخاب مسافر",
}: {
  items: TripPassengerSwitcherItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  ariaLabel?: string;
}) {
  if (items.length <= 1) return null;

  return (
    <div
      className={styles.passengerSwitcher}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const selected = index === activeIndex;
        return (
          <button
            key={item.tripId}
            type="button"
            role="tab"
            id={`passenger-tab-${item.tripId}`}
            aria-selected={selected}
            aria-controls={`passenger-panel-${item.tripId}`}
            tabIndex={selected ? 0 : -1}
            className={styles.passengerTab}
            data-selected={selected ? "true" : undefined}
            onClick={() => onSelect(index)}
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className={styles.passengerTabBadge}>{item.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
