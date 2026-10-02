import { useSyncExternalStore } from "react";

const key = "iruka-desktop-bottom-bar";
const listeners = new Set<() => void>();
let enabled = read();
function read() {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}
function emit() { listeners.forEach((listener) => listener()); }
window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === null) { enabled = read(); emit(); }
});
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function setUseDesktopBottomBar(value: boolean) {
  enabled = value;
  try { localStorage.setItem(key, String(value)); } catch { /* Apply for this session. */ }
  emit();
}
export function useDesktopNavigation() {
  const useDesktopBottomBar = useSyncExternalStore(subscribe, () => enabled, () => false);
  return { useDesktopBottomBar, setUseDesktopBottomBar };
}
