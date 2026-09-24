"use client";

import { useEffect, useInsertionEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FieldLabel } from "../form-field/form-field";
import styles from "./time-select.module.css";
import {
  QUICK_MINUTES,
  commitHourText,
  commitMinuteText,
  composeCanonical,
  formatPersianTime,
  padTimePart,
  parseCanonicalTime,
  readHourInput,
  readMinuteInput,
  stepHour,
  stepMinute,
  toPersianDigits,
  withMinuteShortcut,
  type TimeParts,
} from "./time-select-value";

type TimeSelectProps = {
  id: string;
  /** Name of the hidden field carrying the `HH:mm` value. */
  name: string;
  label?: string;
  /** `HH:mm` the field starts on, if any. */
  defaultValue?: string;
  disabled?: boolean;
};

function textFor(part: number | null): string {
  return part === null ? "" : padTimePart(part);
}

/**
 * Compact time field. The closed control matches other form fields; the popover
 * edits hour and minute directly and submits canonical `HH:mm`.
 */
export function TimeSelect({
  id,
  name,
  label,
  defaultValue = "",
  disabled = false,
}: TimeSelectProps) {
  const panelId = `${id}-panel`;
  const [parts, setParts] = useState<TimeParts | null>(() => parseCanonicalTime(defaultValue));
  const [hourText, setHourText] = useState(() => textFor(parseCanonicalTime(defaultValue)?.hour ?? null));
  const [minuteText, setMinuteText] = useState(() =>
    textFor(parseCanonicalTime(defaultValue)?.minute ?? null),
  );
  const [isOpen, setIsOpen] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const [dialogAncestor, setDialogAncestor] = useState<HTMLElement | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const defaultValueRef = useRef(defaultValue);
  useInsertionEffect(() => {
    defaultValueRef.current = defaultValue;
  });

  useLayoutEffect(() => {
    setDialogAncestor(containerRef.current?.closest("dialog") ?? null);
  }, []);

  function applyParsed(next: TimeParts | null) {
    setParts(next);
    setHourText(textFor(next?.hour ?? null));
    setMinuteText(textFor(next?.minute ?? null));
  }

  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) {
      return;
    }

    function handleReset() {
      applyParsed(parseCanonicalTime(defaultValueRef.current));
      setIsOpen(false);
    }

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
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
  }, [isOpen, dialogAncestor]);

  useEffect(() => {
    if (isOpen) {
      hourInputRef.current?.focus();
      hourInputRef.current?.select();
    }
  }, [isOpen]);

  const value = composeCanonical(parts?.hour ?? null, parts?.minute ?? null);
  const displayValue = formatPersianTime(parts);

  function writeParts(next: TimeParts | null) {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = composeCanonical(next?.hour ?? null, next?.minute ?? null);
    }
    applyParsed(next);
  }

  function changeHour(raw: string) {
    const read = readHourInput(raw);
    if (read.hour === null) {
      setHourText("");
      writeParts(null);
      return;
    }
    setHourText(read.text);
    if (read.complete) {
      writeParts({ hour: read.hour, minute: parts?.minute ?? 0 });
    }
  }

  function changeMinute(raw: string) {
    const read = readMinuteInput(raw);
    setMinuteText(read.text);
    if (read.minute !== null && read.complete) {
      writeParts({ hour: parts?.hour ?? 0, minute: read.minute });
    }
  }

  function blurHour() {
    const hour = commitHourText(hourText);
    if (hour === null) {
      writeParts(null);
      return;
    }
    writeParts({ hour, minute: parts?.minute ?? commitMinuteText(minuteText) ?? 0 });
  }

  function blurMinute() {
    const minute = commitMinuteText(minuteText);
    const hour = parts?.hour ?? commitHourText(hourText);
    if (hour === null && minute === null) {
      writeParts(null);
      return;
    }
    writeParts({ hour: hour ?? 0, minute: minute ?? 0 });
  }

  const panel = isOpen ? (
    <div
      className={styles.panel}
      id={panelId}
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={label ? `انتخاب ${label}` : "انتخاب ساعت"}
      style={
        dialogAncestor
          ? panelPosition
            ? {
                position: "fixed",
                top: panelPosition.top,
                left: panelPosition.left,
                right: "auto",
              }
            : { position: "fixed", visibility: "hidden", right: "auto" }
          : undefined
      }
    >
      <div className={styles.segments}>
        <div className={styles.segment}>
          <span className={styles.segmentLabel} id={`${id}-hour-label`}>
            ساعت
          </span>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepButton}
              aria-label="کاهش ساعت"
              onClick={() =>
                writeParts({
                  hour: stepHour(parts?.hour ?? null, -1),
                  minute: parts?.minute ?? 0,
                })
              }
            >
              −
            </button>
            <input
              ref={hourInputRef}
              className={styles.segmentInput}
              inputMode="numeric"
              dir="ltr"
              aria-labelledby={`${id}-hour-label`}
              placeholder="۰۰"
              value={toPersianDigits(hourText)}
              onChange={(event) => changeHour(event.target.value)}
              onBlur={blurHour}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  writeParts({
                    hour: stepHour(parts?.hour ?? commitHourText(hourText), 1),
                    minute: parts?.minute ?? 0,
                  });
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  writeParts({
                    hour: stepHour(parts?.hour ?? commitHourText(hourText), -1),
                    minute: parts?.minute ?? 0,
                  });
                }
              }}
            />
            <button
              type="button"
              className={styles.stepButton}
              aria-label="افزایش ساعت"
              onClick={() =>
                writeParts({
                  hour: stepHour(parts?.hour ?? null, 1),
                  minute: parts?.minute ?? 0,
                })
              }
            >
              +
            </button>
          </div>
        </div>
        <span className={styles.colon} aria-hidden="true">
          :
        </span>
        <div className={styles.segment}>
          <span className={styles.segmentLabel} id={`${id}-minute-label`}>
            دقیقه
          </span>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepButton}
              aria-label="کاهش دقیقه"
              onClick={() =>
                writeParts({
                  hour: parts?.hour ?? 0,
                  minute: stepMinute(parts?.minute ?? null, -1),
                })
              }
            >
              −
            </button>
            <input
              className={styles.segmentInput}
              inputMode="numeric"
              dir="ltr"
              aria-labelledby={`${id}-minute-label`}
              placeholder="۰۰"
              value={toPersianDigits(minuteText)}
              onChange={(event) => changeMinute(event.target.value)}
              onBlur={blurMinute}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  writeParts({
                    hour: parts?.hour ?? 0,
                    minute: stepMinute(parts?.minute ?? commitMinuteText(minuteText), 1),
                  });
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  writeParts({
                    hour: parts?.hour ?? 0,
                    minute: stepMinute(parts?.minute ?? commitMinuteText(minuteText), -1),
                  });
                }
              }}
            />
            <button
              type="button"
              className={styles.stepButton}
              aria-label="افزایش دقیقه"
              onClick={() =>
                writeParts({
                  hour: parts?.hour ?? 0,
                  minute: stepMinute(parts?.minute ?? null, 1),
                })
              }
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className={styles.shortcutSection}>
        <span className={styles.shortcutLabel} id={`${id}-minute-shortcuts`}>
          انتخاب سریع دقیقه
        </span>
        <div className={styles.shortcuts} role="group" aria-labelledby={`${id}-minute-shortcuts`}>
          {QUICK_MINUTES.map((minute) => (
            <button
              key={minute}
              type="button"
              className={styles.shortcut}
              data-selected={parts?.minute === minute || undefined}
              onClick={() => writeParts(withMinuteShortcut(parts, minute))}
            >
              {toPersianDigits(padTimePart(minute))}
            </button>
          ))}
        </div>
      </div>
      {parts && (
        <button type="button" className={styles.clearButton} onClick={() => writeParts(null)}>
          پاک کردن
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className={styles.field} ref={containerRef}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <input ref={hiddenInputRef} type="hidden" name={name} value={value} readOnly />
      <button
        className={styles.trigger}
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.triggerIcon} aria-hidden="true">
          <ClockIcon />
        </span>
        <span className={displayValue ? styles.value : styles.placeholder}>
          {displayValue ?? "انتخاب ساعت"}
        </span>
      </button>
      {panel && (dialogAncestor ? createPortal(panel, dialogAncestor) : panel)}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
