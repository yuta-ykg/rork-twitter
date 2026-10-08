import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
const key = "iruka-theme";
const listeners = new Set<() => void>();

function stored(): ThemeMode {
  try {
    const v = localStorage.getItem(key);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* ignore */ }
  return "system";
}
let mode: ThemeMode = stored();

/** ドキュメントにテーマを反映する。 */
export function applyTheme(): void {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(next: ThemeMode): void {
  mode = next;
  try { localStorage.setItem(key, next); } catch { /* ignore */ }
  applyTheme();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
}

export function useTheme(): { theme: ThemeMode; setTheme: (m: ThemeMode) => void } {
  const theme = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => mode,
    () => "system" as ThemeMode,
  );
  return { theme, setTheme };
}
