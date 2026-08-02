// // src/shared/constants/theme.ts
// export const theme = {
//   colors: {
//     // Primary colors
//     primary: {
//       50: "#f0f9ff",
//       100: "#e0f2fe",
//       200: "#bae6fd",
//       300: "#7dd3fc",
//       400: "#38bdf8",
//       500: "#0ea5e9",
//       600: "#0284c7",
//       700: "#0369a1",
//       800: "#075985",
//       900: "#0c4a6e",
//     },
//     // Dark theme colors
//     dark: {
//       background: "#0a1628",
//       surface: "#0f2040",
//       surfaceLight: "rgba(255,255,255,0.06)",
//       surfaceHover: "rgba(255,255,255,0.1)",
//       border: "rgba(14,165,233,0.15)",
//       text: {
//         primary: "#ffffff",
//         secondary: "rgba(255,255,255,0.7)",
//         muted: "rgba(255,255,255,0.4)",
//         dim: "rgba(255,255,255,0.2)",
//       },
//     },
//     // Status colors
//     status: {
//       online: "#22c55e",
//       offline: "#64748b",
//       busy: "#f59e0b",
//       error: "#ef4444",
//     },
//     gradient: {
//       header: ["#0a1628", "#0c4a6e", "#0369a1"],
//       button: ["#0ea5e9", "#0284c7"],
//     },
//   },
//   spacing: {
//     xs: 4,
//     sm: 8,
//     md: 16,
//     lg: 24,
//     xl: 32,
//     xxl: 48,
//   },
//   borderRadius: {
//     sm: 8,
//     md: 12,
//     lg: 16,
//     xl: 20,
//     xxl: 24,
//     full: 9999,
//   },
//   typography: {
//     fontFamily: "Inter, sans-serif",
//     sizes: {
//       xs: 10,
//       sm: 12,
//       base: 14,
//       lg: 16,
//       xl: 18,
//       "2xl": 22,
//       "3xl": 26,
//       "4xl": 32,
//     },
//     weights: {
//       normal: "400",
//       medium: "500",
//       semibold: "600",
//       bold: "700",
//       extrabold: "800",
//     },
//   },
// };
// src/shared/constants/theme.ts

export const theme = {
  colors: {
    primary: {
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
    },
    // Light theme
    light: {
      background: "#ffffff",
      surface: "#ffffff",
      surfaceSecondary: "#f8fafc",
      border: "#e2e8f0",
      text: {
        primary: "#0f172a",
        secondary: "#475569",
        muted: "#94a3b8",
        dim: "#cbd5e1",
      },
      shadow: "0 2px 8px rgba(0,0,0,0.06)",
    },
    status: {
      online: "#22c55e",
      busy: "#f59e0b",
      error: "#ef4444",
      offline: "#94a3b8",
    },
    gradient: {
      header: ["#0ea5e9", "#0284c7"],
      button: ["#0ea5e9", "#0284c7"],
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
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
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
};

// Helper to access light theme
export const lightTheme = theme.colors.light;
