// src/shared/theme/ThemeProvider.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nwColorScheme } from "nativewind";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { Palette, palettes, ThemeName, theme } from "../constants/theme";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "jeepqtrack.theme-mode";

interface ThemeContextValue {
  /** User preference, may be "system". */
  mode: ThemeMode;
  /** Concrete theme actually in effect. */
  resolved: ThemeName;
  colors: Palette;
  isDark: boolean;
  spacing: typeof theme.spacing;
  radius: typeof theme.borderRadius;
  setMode: (mode: ThemeMode) => void;
  /** Cycles light → dark → system. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  // Restore the saved preference once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (saved === "light" || saved === "dark" || saved === "system")) {
          setModeState(saved);
        }
      } catch {
        // Non-fatal: fall back to the default mode.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved: ThemeName = useMemo(() => {
    if (mode === "system") return systemScheme === "light" ? "light" : "dark";
    return mode;
  }, [mode, systemScheme]);

  // Keep NativeWind's `dark:` variants in sync with the resolved theme.
  useEffect(() => {
    nwColorScheme.set(resolved);
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persistence is best-effort.
    });
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light");
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved,
      colors: palettes[resolved],
      isDark: resolved === "dark",
      spacing: theme.spacing,
      radius: theme.borderRadius,
      setMode,
      toggle,
    }),
    [mode, resolved, setMode, toggle],
  );

  // Avoid a light/dark flash before the stored preference is known.
  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so components remain usable outside the provider
    // (e.g. isolated tests) instead of throwing.
    return {
      mode: "dark",
      resolved: "dark",
      colors: palettes.dark,
      isDark: true,
      spacing: theme.spacing,
      radius: theme.borderRadius,
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

export const THEME_MODE_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];
