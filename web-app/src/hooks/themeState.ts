import { createContext, useContext } from "react";

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
export function storedTheme(): Theme {
  try { return validTheme(localStorage.getItem(key)); } catch { return "system"; }
}
export function saveTheme(value: Theme): Theme {
  const selected = validTheme(value);
  try { localStorage.setItem(key, selected); } catch { /* Still apply for this session. */ }
  return selected;
}

export const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is missing");
  return context;
}
