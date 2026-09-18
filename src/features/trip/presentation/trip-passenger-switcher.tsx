"use client";

import { ActionButton } from "../../../components/ui/action-button/action-button";
import styles from "./create-request/create-trip.module.css";

export type TripPassengerSwitcherProps = {
  passengerCount: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  disabled?: boolean;
  addLabel?: string;
  tabLabel?: (index: number) => string;
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
  ariaLabel = "انتخاب مسافر",
}: TripPassengerSwitcherProps) {
  return (
    <div className={styles.passengerSwitcher} role="tablist" aria-label={ariaLabel}>
      <div className={styles.passengerTabs}>
        {Array.from({ length: passengerCount }, (_, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              className={styles.passengerTab}
              data-selected={selected ? "" : undefined}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onSelect(index)}
            >
              {tabLabel(index)}
            </button>
          );
        })}
        <ActionButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={onAdd}
        >
          {addLabel}
        </ActionButton>
      </div>
    </div>
  );
}
