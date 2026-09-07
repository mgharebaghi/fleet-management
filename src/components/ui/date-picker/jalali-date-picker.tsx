"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FieldLabel } from "../form-field/form-field";
import styles from "./jalali-date-picker.module.css";
import {
  addJalaliMonths,
  formatJalaliDate,
  formatJalaliNumber,
  getJalaliMonthLength,
  getJalaliMonthStartWeekday,
  gregorianToJalali,
  jalaliMonthNames,
  jalaliToGregorianDateString,
  jalaliWeekdayNames,
  type JalaliDateParts,
} from "./jalali-date";

type JalaliDatePickerProps = {
  /** Name of the hidden field carrying the Gregorian `yyyy-mm-dd` value. */
  name: string;
  label: string;
  /** Gregorian `yyyy-mm-dd` the field starts on, if any. */
  defaultValue?: string;
  /** Latest selectable Gregorian `yyyy-mm-dd`; later days are disabled. */
  maxDate?: string;
  /** Earliest selectable Gregorian `yyyy-mm-dd`. */
  minDate?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

function getTodayGregorianDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toGregorianDate(parts: JalaliDateParts): string {
  return jalaliToGregorianDateString(parts.year, parts.month, parts.day) ?? "";
}

export function JalaliDatePicker({
  name,
  label,
  defaultValue = "",
  maxDate,
  minDate,
  disabled = false,
  invalid = false,
  describedBy,
}: JalaliDatePickerProps) {
  const fieldId = useId();
  const panelId = `${fieldId}-panel`;
  const [selectedDate, setSelectedDate] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<JalaliDateParts>(() =>
    gregorianToJalali(defaultValue || getTodayGregorianDate()),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null);
  // A native <dialog> shown via showModal() paints its whole subtree in the
  // browser's top layer, above the rest of the page; a Dialog-hosted picker
  // must portal inside that dialog element (not document.body, which isn't
  // part of the top layer) to stay visible above it and escape the dialog's
  // own overflow:hidden/scrolling body. Pages without a Dialog ancestor keep
  // the original in-place panel so their existing structure/tests are unaffected.
  const [dialogAncestor, setDialogAncestor] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setDialogAncestor(containerRef.current?.closest("dialog") ?? null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      // Portaled-into-dialog panels are no longer DOM descendants of the
      // container, so a click inside the panel must also count as "inside".
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Flips the panel above the field when it would not fit below. Measuring
  // needs the panel laid out, so the placement is (re)computed once open.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = triggerRef.current;

    if (!isOpen || panel === null || trigger === null) {
      return;
    }

    if (!dialogAncestor) {
      const triggerRect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      panel.classList.toggle(
        styles.panelAbove,
        spaceBelow < panel.offsetHeight + 8 && triggerRect.top > spaceBelow,
      );
      return;
    }

    // Portaled path: the panel is `position: fixed`, so it is placed in
    // viewport coordinates here instead of via ancestor-relative CSS.
    function place() {
      const triggerRect = trigger!.getBoundingClientRect();
      const panelHeight = panel!.offsetHeight;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const above = spaceBelow < panelHeight + 8 && triggerRect.top > spaceBelow;
      setPanelPosition({
        top: above ? triggerRect.top - panelHeight - 4 : triggerRect.bottom + 4,
        left: triggerRect.left,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, visibleMonth, dialogAncestor]);

  const today = getTodayGregorianDate();
  const selectedParts = selectedDate ? gregorianToJalali(selectedDate) : null;
  const monthLength = getJalaliMonthLength(
    visibleMonth.year,
    visibleMonth.month,
  );
  const startWeekday = getJalaliMonthStartWeekday(
    visibleMonth.year,
    visibleMonth.month,
  );

  function openPanel() {
    setVisibleMonth(gregorianToJalali(selectedDate || today));
    setIsOpen(true);
  }

  function selectDay(day: number) {
    setSelectedDate(
      toGregorianDate({ ...visibleMonth, day }),
    );
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function clearDate() {
    setSelectedDate("");
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const panel = isOpen ? (
    <div
      className={styles.panel}
      id={panelId}
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`انتخاب ${label}`}
      // `right: "auto"` cancels the CSS class's `inset-inline-start` (which
      // resolves to `right` in this RTL app) so the inline `left` from a
      // physical viewport measurement is the only horizontal constraint.
      style={dialogAncestor ? (panelPosition ? { position: "fixed", top: panelPosition.top, left: panelPosition.left, right: "auto" } : { position: "fixed", visibility: "hidden", right: "auto" }) : undefined}
    >
      <div className={styles.panelHeader}>
        <button
          className={styles.monthButton}
          type="button"
          onClick={() => setVisibleMonth(addJalaliMonths(visibleMonth, -1))}
          aria-label="ماه قبل"
        >
          ›
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {jalaliMonthNames[visibleMonth.month - 1]}{" "}
          {formatJalaliNumber(visibleMonth.year)}
        </span>
        <button
          className={styles.monthButton}
          type="button"
          onClick={() => setVisibleMonth(addJalaliMonths(visibleMonth, 1))}
          aria-label="ماه بعد"
        >
          ‹
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {jalaliWeekdayNames.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div
        className={styles.days}
        role="group"
        aria-label="روزهای ماه"
      >
        {Array.from({ length: startWeekday }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: monthLength }, (_, index) => index + 1).map(
          (day) => {
            const gregorianDate = toGregorianDate({
              ...visibleMonth,
              day,
            });
            const isSelected = gregorianDate === selectedDate;
            const isToday = gregorianDate === today;
            const isOutOfRange =
              (maxDate !== undefined && gregorianDate > maxDate) ||
              (minDate !== undefined && gregorianDate < minDate);

            return (
              <button
                key={day}
                className={`${styles.day}${isSelected ? ` ${styles.selected}` : ""}${isToday ? ` ${styles.today}` : ""}`}
                type="button"
                disabled={isOutOfRange}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => selectDay(day)}
              >
                {formatJalaliNumber(day)}
              </button>
            );
          },
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={styles.field} ref={containerRef}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>

      {/* The Gregorian value is what the form submits; the calendar is the
          only way to set it, so there is no free-text date entry. */}
      <input type="hidden" name={name} value={selectedDate} readOnly />

      <div className={styles.controlRow}>
        <button
          className={styles.trigger}
          id={fieldId}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          // A button role cannot carry aria-invalid; the error itself is
          // announced through aria-describedby.
          data-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        >
          <span className={selectedParts ? styles.value : styles.placeholder}>
            {selectedParts ? formatJalaliDate(selectedParts) : "انتخاب تاریخ"}
          </span>
          <span className={styles.triggerIcon} aria-hidden="true">
            ▾
          </span>
        </button>

        {selectedParts && !disabled && (
          <button
            className={styles.clearButton}
            type="button"
            onClick={clearDate}
          >
            پاک کردن
          </button>
        )}
      </div>

      {panel && (dialogAncestor ? createPortal(panel, dialogAncestor) : panel)}
    </div>
  );
}
