import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

export const themeOptions = [
  { value: "light", label: "ライト" },
  { value: "mint", label: "ミント" },
  { value: "dark", label: "ダーク" },
  { value: "dark-blue", label: "ダークブルー" },
  { value: "system", label: "システム" },
] as const;
export type Theme = typeof themeOptions[number]["value"];
const key = "iruka-theme";
export function validTheme(value: unknown): Theme {
  return themeOptions.some((theme) => theme.value === value) ? value as Theme : "system";
}
export function resolveTheme(theme: Theme, dark: boolean): Exclude<Theme, "system"> {
  return theme === "system" ? (dark ? "dark" : "light") : theme;
}
function storedTheme(): Theme {
  try { return validTheme(localStorage.getItem(key)); } catch { return "system"; }
}
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setMode] = useState<Theme>(storedTheme);
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const resolved = resolveTheme(theme, media.matches);
      document.documentElement.dataset.theme = resolved;
      const isDark = resolved === "dark" || resolved === "dark-blue";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useLayoutEffect(() => {
    function sync(event: StorageEvent) { if (event.key === key || event.key === null) setMode(storedTheme()); }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function setTheme(next: Theme) {
    const selected = validTheme(next);
    try { localStorage.setItem(key, selected); } catch { /* Still apply for this session. */ }
    setMode(selected);
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is missing");
  return context;
}
