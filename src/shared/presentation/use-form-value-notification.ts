"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Composite controls notify their form after their hidden submitted value changes. */
export function useFormValueNotification(input: RefObject<HTMLInputElement | null>, value: string) {
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current !== value) input.current?.dispatchEvent(new Event("input", { bubbles: true }));
    previous.current = value;
  }, [input, value]);
}
