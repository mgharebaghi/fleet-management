"use client";

import { ActionButton } from "../../../../components/ui/action-button/action-button";
import styles from "../create-request/create-trip.module.css";

export type TripPassengerSwitcherProps = {
  passengerCount: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd?: () => void;
  disabled?: boolean;
  addLabel?: string;
  tabLabel?: (index: number) => string;
  tabBadge?: (index: number) => string | null | undefined;
  tabId?: (index: number) => string | undefined;
  tabPanelId?: (index: number) => string | undefined;
  ariaLabel?: string;
};

export function TripPassengerSwitcher({
  passengerCount,
  activeIndex,
  onSelect,
  onAdd,
  disabled = false,
  addLabel = "افزودن مسافر",
  tabLabel = (index) => `مسافر ${index + 1}`,
  tabBadge,
  tabId,
  tabPanelId,
  ariaLabel = "انتخاب مسافر",
}: TripPassengerSwitcherProps) {
  if (passengerCount <= 0) return null;

  return (
    <div className={styles.passengerSwitcher} role="tablist" aria-label={ariaLabel}>
      <div className={styles.passengerTabs}>
        {Array.from({ length: passengerCount }, (_, index) => {
          const selected = index === activeIndex;
          const badge = tabBadge?.(index);
          const id = tabId?.(index);
          const controls = tabPanelId?.(index);
          return (
            <button
              key={id ?? index}
              type="button"
              role="tab"
              id={id}
              aria-controls={controls}
              className={styles.passengerTab}
              data-selected={selected ? "" : undefined}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onSelect(index)}
            >
              <span>{tabLabel(index)}</span>
              {badge && <span className={styles.passengerTabBadge}>{badge}</span>}
            </button>
          );
        })}
        {onAdd && (
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onAdd}
          >
            {addLabel}
          </ActionButton>
        )}
      </div>
    </div>
  );
}
