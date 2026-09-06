"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useInsertionEffect, useLayoutEffect, useRef, useState } from "react";

import { FieldLabel } from "../form-field/form-field";
import styles from "./searchable-select.module.css";
import {
  filterSearchableOptions,
  type SearchableSelectOption,
} from "./searchable-select-options";

type SearchableSelectProps = {
  /** Name of the hidden field carrying the selected option's `value`. */
  name: string;
  label: string;
  required?: boolean;
  options: readonly SearchableSelectOption[];
  /** Selected option's `value`, if any. */
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Folds Persian/Arabic digits or letters before matching; defaults to no folding. */
  normalizeQuery?: (value: string) => string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * A searchable single-select: a trigger showing the current selection and a
 * panel with a text filter over a listbox, so long option lists (like every
 * fleet vehicle) stay usable without a native `<select>`'s plain-text rows.
 */
export function SearchableSelect({
  name,
  label,
  required = false,
  options,
  defaultValue = "",
  placeholder = "انتخاب",
  searchPlaceholder = "جستجو…",
  emptyMessage = "موردی پیدا نشد",
  normalizeQuery = (value) => value,
  disabled = false,
  invalid = false,
  describedBy,
}: SearchableSelectProps) {
  const fieldId = useId();
  const panelId = `${fieldId}-panel`;
  const listboxId = `${fieldId}-listbox`;
  const optionDomId = (value: string) => `${fieldId}-option-${value}`;

  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;
  const filteredOptions = filterSearchableOptions(options, query, normalizeQuery);

  // Kept in sync via an insertion effect - the one effect timing that commits
  // before React applies this render's DOM mutations - so the native "reset"
  // handler below (which fires synchronously as part of that same mutation
  // phase) always reads the value as of the render that is currently
  // committing, never a stale one from before it.
  const defaultValueRef = useRef(defaultValue);
  useInsertionEffect(() => {
    defaultValueRef.current = defaultValue;
  });

  // React itself calls the underlying `<form>`'s real native reset() after
  // every action-form submission, success or failure alike (not only from an
  // explicit `formRef.current?.reset()` call) - so this field must always
  // resolve back to its *current* `defaultValue` prop, not a hardcoded empty
  // value. A consumer that needs to retain a value across a validation error
  // (like Create VehicleInsurance) achieves that by echoing the submitted
  // value back as `defaultValue`, which makes this "reset" a no-op for it;
  // a consumer whose `defaultValue` stays constant (like the create-model
  // dialog) correctly returns to its placeholder.
  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) {
      return;
    }

    function handleReset() {
      setSelectedValue(defaultValueRef.current);
      setQuery("");
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
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
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

  // Flips the panel above the field when it would not fit below, matching
  // the Jalali date picker's placement behavior.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = triggerRef.current;

    if (panel === null || trigger === null) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;

    panel.classList.toggle(
      styles.panelAbove,
      spaceBelow < panel.offsetHeight + 8 && triggerRect.top > spaceBelow,
    );
  }, [isOpen, query]);

  function openPanel() {
    const currentIndex = options.findIndex((option) => option.value === selectedValue);
    setQuery("");
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    setIsOpen(true);
    // The panel mounts after this click; focus once it exists.
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function closePanel() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function selectOption(option: SearchableSelectOption) {
    if (option.disabled) {
      return;
    }
    setSelectedValue(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) {
        selectOption(option);
      }
    }
  }

  const activeOption = filteredOptions[activeIndex];

  return (
    <div className={styles.field} ref={containerRef}>
      <FieldLabel htmlFor={fieldId} required={required}>{label}</FieldLabel>

      {/* The Application only ever sees the selected option's value. */}
      <input ref={hiddenInputRef} type="hidden" name={name} value={selectedValue} readOnly />

      <button
        className={styles.trigger}
        id={fieldId}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        data-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (isOpen ? closePanel() : openPanel())}
      >
        <span className={selectedOption ? styles.value : styles.placeholder}>
          {selectedOption ? (selectedOption.triggerContent ?? selectedOption.content) : placeholder}
        </span>
        <span className={styles.triggerIcon} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className={styles.panel}
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={`جستجوی ${label}`}
        >
          <input
            ref={searchRef}
            className={styles.search}
            type="text"
            role="combobox"
            aria-label={`جستجوی ${label}`}
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? optionDomId(activeOption.value) : undefined}
            value={query}
            placeholder={searchPlaceholder}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
          />

          <ul className={styles.options} id={listboxId} role="listbox" aria-label={label}>
            {filteredOptions.length === 0 && (
              <li className={styles.empty}>{emptyMessage}</li>
            )}
            {filteredOptions.map((option, index) => (
              <li
                key={option.value}
                id={optionDomId(option.value)}
                role="option"
                aria-selected={option.value === selectedValue}
                aria-disabled={option.disabled || undefined}
                className={`${styles.option}${index === activeIndex ? ` ${styles.optionActive}` : ""}${option.disabled ? ` ${styles.optionDisabled}` : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
