"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useInsertionEffect, useLayoutEffect, useRef, useState } from "react";

import { FieldLabel } from "../form-field/form-field";
import {
  filterSearchableOptions,
  type SearchableSelectOption,
} from "../searchable-select/searchable-select-options";
import selectStyles from "../searchable-select/searchable-select.module.css";
import styles from "./searchable-combobox.module.css";

type SearchableComboboxProps = {
  id?: string;
  /** Name of the text field. The submitted value is the typed or chosen text. */
  name: string;
  label: string;
  suggestions: readonly string[];
  defaultValue?: string;
  /** When set, the field shows this text instead of its internal value. */
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Free-text field with the shared searchable-select dropdown.
 * Suggestions are optional; a value that matches none of them is still submitted.
 */
export function SearchableCombobox({
  id,
  name,
  label,
  suggestions,
  defaultValue = "",
  value,
  onValueChange,
  placeholder = "",
  disabled = false,
  invalid = false,
  describedBy,
}: SearchableComboboxProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const [uncontrolledText, setUncontrolledText] = useState(defaultValue);
  const text = value !== undefined ? value : uncontrolledText;

  function publishText(next: string) {
    if (value === undefined) setUncontrolledText(next);
    onValueChange?.(next);
  }
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const options: SearchableSelectOption[] = suggestions.map((suggestion) => ({
    value: suggestion,
    label: suggestion,
    searchText: suggestion,
    content: suggestion,
  }));
  const filteredOptions = filterSearchableOptions(
    options,
    filterQuery ?? "",
    (value) => value,
  );

  const defaultValueRef = useRef(defaultValue);
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  useInsertionEffect(() => {
    defaultValueRef.current = defaultValue;
    valueRef.current = value;
    onValueChangeRef.current = onValueChange;
  });

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) {
      return;
    }

    function handleReset() {
      if (valueRef.current === undefined) {
        setUncontrolledText(defaultValueRef.current);
      }
      onValueChangeRef.current?.(defaultValueRef.current);
      setFilterQuery(null);
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

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const input = inputRef.current;
    if (!isOpen || panel === null || input === null) {
      return;
    }
    const triggerRect = input.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    panel.classList.toggle(
      selectStyles.panelAbove,
      spaceBelow < panel.offsetHeight + 8 && triggerRect.top > spaceBelow,
    );
  }, [isOpen, filterQuery, text]);

  function openPanel() {
    if (disabled) {
      return;
    }
    setFilterQuery(null);
    setActiveIndex(0);
    setIsOpen(true);
  }

  function selectSuggestion(next: string) {
    publishText(next);
    setFilterQuery(null);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openPanel();
        return;
      }
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      if (!isOpen) {
        return;
      }
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && isOpen) {
      const option = filteredOptions[activeIndex];
      if (!option) {
        return;
      }
      event.preventDefault();
      selectSuggestion(option.value);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const activeOption = filteredOptions[activeIndex];

  return (
    <div className={selectStyles.field} ref={containerRef}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <div className={styles.control}>
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          className={`${selectStyles.trigger} ${styles.input}`}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && activeOption ? `${fieldId}-option-${activeIndex}` : undefined
          }
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          value={text}
          onFocus={openPanel}
          onClick={openPanel}
          onChange={(event) => {
            publishText(event.target.value);
            setFilterQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={styles.toggle}
          tabIndex={-1}
          disabled={disabled}
          aria-label={`پیشنهادهای ${label}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        >
          <span className={selectStyles.triggerIcon} aria-hidden="true">
            ▾
          </span>
        </button>
      </div>
      {isOpen && (
        <div
          className={selectStyles.panel}
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={`پیشنهادهای ${label}`}
        >
          <ul className={selectStyles.options} id={listboxId} role="listbox" aria-label={label}>
            {filteredOptions.length === 0 ? (
              <li className={selectStyles.empty}>پیشنهادی پیدا نشد؛ همین متن ثبت می‌شود.</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  id={`${fieldId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === text}
                  className={`${selectStyles.option}${index === activeIndex ? ` ${selectStyles.optionActive}` : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(option.value)}
                >
                  {option.content}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
