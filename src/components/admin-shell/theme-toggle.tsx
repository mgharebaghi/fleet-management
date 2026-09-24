"use client";

import { useSyncExternalStore } from "react";

import styles from "./admin-shell.module.css";

const THEME_KEY = "fleet-theme";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("fleet-theme-change", onStoreChange);
  return () => window.removeEventListener("fleet-theme-change", onStoreChange);
}

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as const);
  const nextIsDark = theme !== "dark";

  function toggleTheme() {
    const next = nextIsDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    window.dispatchEvent(new Event("fleet-theme-change"));
  }

  return (
    <button
      type="button"
      className={styles.themeToggle}
      aria-label="تغییر تم"
      title="تغییر تم"
      onClick={toggleTheme}
    >
      <span className={styles.themeIcon} aria-hidden="true">
        {nextIsDark ? "☾" : "☀"}
      </span>
      <span className={styles.themeLabel}>{nextIsDark ? "تاریک" : "روشن"}</span>
    </button>
  );
}

export function TopDate() {
  const label = useSyncExternalStore(
    () => () => {},
    () =>
      new Intl.DateTimeFormat("fa-IR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    () => "",
  );

  if (!label) {
    return null;
  }

  return <span className={styles.topDate}>{label}</span>;
}
