import { useSyncExternalStore } from "react";

export type TextSize = "standard" | "large" | "extra-large";
const key = "iruka-text-size";
const listeners = new Set<() => void>();
function stored(): TextSize {
  try {
    const value = localStorage.getItem(key);
    if (value === "large" || value === "extra-large") return value;
  } catch { /* Storage may be unavailable. Keep the setting in memory. */ }
  return "standard";
}
let size = stored();
export function applyTextSize(): void {
  document.documentElement.dataset.textSize = size;
  document.documentElement.style.setProperty("--text-scale", size === "large" ? "1.2" : size === "extra-large" ? "1.4" : "1");
}
function setTextSize(next: TextSize): void {
  size = next;
  try { localStorage.setItem(key, size); } catch { /* in-memory fallback */ }
  applyTextSize();
  listeners.forEach((listener) => listener());
}
window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === null) {
    size = stored(); applyTextSize(); listeners.forEach((listener) => listener());
  }
});
export function useTextSize() {
  const textSize = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => size,
    () => "standard" as TextSize,
  );
  return { textSize, setTextSize };
}
