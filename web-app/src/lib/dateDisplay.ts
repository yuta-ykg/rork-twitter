import { useSyncExternalStore } from "react";
import { getLanguage, t } from "./language";

export const dateDisplayOptions = [
  { value: "relative", label: "相対表示" },
  { value: "short", label: "月日と時刻" },
  { value: "full", label: "年月日と時刻" },
] as const;

export type DateDisplayStyle = typeof dateDisplayOptions[number]["value"];

const key = "iruka-date-display";
function validDateDisplay(value: unknown): DateDisplayStyle {
  return dateDisplayOptions.some((option) => option.value === value) ? value as DateDisplayStyle : "relative";
}
function storedDateDisplay(): DateDisplayStyle {
  try { return validDateDisplay(localStorage.getItem(key)); } catch { return "relative"; }
}

let currentDateDisplay = storedDateDisplay();
const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      currentDateDisplay = storedDateDisplay();
      notify();
    }
  });
}

export function getDateDisplay(): DateDisplayStyle { return currentDateDisplay; }
export function setDateDisplay(style: DateDisplayStyle) {
  currentDateDisplay = validDateDisplay(style);
  try { localStorage.setItem(key, currentDateDisplay); } catch { /* Keep the selection for this session. */ }
  notify();
}
export function useDateDisplay() {
  return useSyncExternalStore(subscribe, getDateDisplay, () => "relative" as DateDisplayStyle);
}

function locale() {
  return getLanguage() === "en" ? "en-US" : getLanguage() === "ko" ? "ko-KR" : "ja-JP";
}

export function formatDateTime(input: Date | string, includeTime = true): string {
  const date = input instanceof Date ? input : new Date(input);
  const current = new Date();
  const yesterday = new Date(current);
  yesterday.setDate(current.getDate() - 1);
  const isToday = date.toDateString() === current.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });

  if (currentDateDisplay === "relative") {
    if (!includeTime && isToday) return t("今日");
    if (!includeTime && isYesterday) return t("昨日");
    if (includeTime && isToday) return `${t("今朝")} ${time}`;
    if (includeTime && isYesterday) return `${t("昨日")} ${time}`;
  }

  if (currentDateDisplay === "full") {
    return date.toLocaleString(locale(), includeTime
      ? { dateStyle: "long", timeStyle: "short" }
      : { dateStyle: "long" });
  }
  return date.toLocaleString(locale(), includeTime
    ? { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { year: "numeric", month: "numeric", day: "numeric" });
}
