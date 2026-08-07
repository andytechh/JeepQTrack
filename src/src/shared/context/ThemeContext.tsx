// src/shared/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const [theme, setThemeState] = useState<ThemeMode>(
    settings.darkMode ? "dark" : "light",
  );

  // Sync with settings changes (e.g., from reset)
  useEffect(() => {
    setThemeState(settings.darkMode ? "dark" : "light");
  }, [settings.darkMode]);

  const toggleTheme = () => {
    const newMode = theme === "light" ? "dark" : "light";
    setThemeState(newMode);
    updateSettings({ darkMode: newMode === "dark" });
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    updateSettings({ darkMode: mode === "dark" });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
