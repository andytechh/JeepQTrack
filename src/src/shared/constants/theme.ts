// src/shared/constants/theme.ts

const primary = {
  50: "#f0f9ff",
  100: "#e0f2fe",
  200: "#bae6fd",
  300: "#7dd3fc",
  400: "#38bdf8",
  500: "#0ea5e9",
  600: "#0284c7",
  700: "#0369a1",
  800: "#075985",
  900: "#0c4a6e",
  950: "#0a1628",
};

/**
 * Semantic ramps. These are exposed both as a ramp (`success[500]`) and with
 * `light` / `DEFAULT` / `dark` members, because existing screens access them
 * both ways (`theme.colors.success` used directly as a color string, and
 * `theme.colors.success[500]`). `DEFAULT` + `toString` keeps both valid.
 */
function ramp(shades: Record<number, string>) {
  return {
    ...shades,
    light: shades[100],
    DEFAULT: shades[500],
    dark: shades[700],
    toString: () => shades[500],
  };
}

const success = ramp({
  50: "#f0fdf4",
  100: "#dcfce7",
  400: "#4ade80",
  500: "#22c55e",
  600: "#16a34a",
  700: "#15803d",
});

const warning = ramp({
  50: "#fffbeb",
  100: "#fef3c7",
  400: "#fbbf24",
  500: "#f59e0b",
  600: "#d97706",
  700: "#b45309",
});

const danger = ramp({
  50: "#fef2f2",
  100: "#fee2e2",
  400: "#f87171",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
});

const info = ramp({
  50: "#eff6ff",
  100: "#dbeafe",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
});

const secondary = ramp({
  50: "#f8fafc",
  100: "#f1f5f9",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
});

/** Dark palette — the original app look. */
export const darkPalette = {
  background: "#0a1628",
  backgroundAlt: "#0c1f3a",
  surface: "#0f2040",
  surfaceLight: "rgba(255,255,255,0.06)",
  surfaceHover: "rgba(255,255,255,0.1)",
  surfaceSolid: "#13294d",
  border: "rgba(14,165,233,0.15)",
  borderStrong: "rgba(14,165,233,0.32)",
  overlay: "rgba(3,10,22,0.72)",
  tint: primary[400],
  onTint: "#ffffff",
  text: {
    primary: "#ffffff",
    secondary: "rgba(255,255,255,0.7)",
    muted: "rgba(255,255,255,0.45)",
    dim: "rgba(255,255,255,0.22)",
    inverse: "#0a1628",
  },
  gradient: {
    header: ["#0a1628", "#0c4a6e", "#0369a1"],
    button: ["#0ea5e9", "#0284c7"],
    card: ["rgba(14,165,233,0.16)", "rgba(14,165,233,0.04)"],
  },
};

/** Light palette — same brand hue, inverted surfaces. */
export const lightPalette = {
  background: "#f4f7fb",
  backgroundAlt: "#eaf1f8",
  surface: "#ffffff",
  surfaceLight: "rgba(14,165,233,0.06)",
  surfaceHover: "rgba(14,165,233,0.12)",
  surfaceSolid: "#ffffff",
  border: "rgba(15,32,64,0.1)",
  borderStrong: "rgba(3,105,161,0.28)",
  overlay: "rgba(15,32,64,0.45)",
  tint: primary[600],
  onTint: "#ffffff",
  text: {
    primary: "#0b1b32",
    secondary: "rgba(11,27,50,0.68)",
    muted: "rgba(11,27,50,0.48)",
    dim: "rgba(11,27,50,0.26)",
    inverse: "#ffffff",
  },
  gradient: {
    header: ["#0369a1", "#0284c7", "#0ea5e9"],
    button: ["#0ea5e9", "#0284c7"],
    card: ["rgba(14,165,233,0.1)", "rgba(14,165,233,0.02)"],
  },
};

export type Palette = typeof darkPalette;
export type ThemeName = "light" | "dark";

export const palettes: Record<ThemeName, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

export const theme = {
  colors: {
    primary,
    secondary,
    success,
    warning,
    danger,
    error: danger,
    info,
    // Backwards-compatible: `theme.colors.dark.*` is used widely already.
    dark: darkPalette,
    light: lightPalette,
    status: {
      online: success[500],
      offline: secondary[500],
      busy: warning[500],
      error: danger[500],
      idle: info[500],
    },
    gradient: {
      header: darkPalette.gradient.header,
      button: darkPalette.gradient.button,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    sizes: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 18,
      "2xl": 22,
      "3xl": 26,
      "4xl": 32,
    },
    weights: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
  },
} as const;

/** Occupancy → semantic color, shared by map markers and occupancy bars. */
export function occupancyColor(occupancy: number, capacity: number) {
  if (!capacity) return secondary[500];
  const ratio = occupancy / capacity;
  if (ratio >= 0.9) return danger[500];
  if (ratio >= 0.6) return warning[500];
  return success[500];
}
