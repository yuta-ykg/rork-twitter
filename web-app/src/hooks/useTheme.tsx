import { useLayoutEffect, useState, type ReactNode } from "react";
import { resolveTheme, saveTheme, storedTheme, ThemeContext, type Theme } from "@/hooks/themeState";

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
    function sync(event: StorageEvent) { if (event.key === "iruka-theme" || event.key === null) setMode(storedTheme()); }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function setTheme(next: Theme) {
    setMode(saveTheme(next));
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
