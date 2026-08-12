// // // src/shared/constants/theme.ts
// // export const theme = {
// //   colors: {
// //     // Primary colors
// //     primary: {
// //       50: "#f0f9ff",
// //       100: "#e0f2fe",
// //       200: "#bae6fd",
// //       300: "#7dd3fc",
// //       400: "#38bdf8",
// //       500: "#0ea5e9",
// //       600: "#0284c7",
// //       700: "#0369a1",
// //       800: "#075985",
// //       900: "#0c4a6e",
// //     },
// //     // Dark theme colors
// //     dark: {
// //       background: "#0a1628",
// //       surface: "#0f2040",
// //       surfaceLight: "rgba(255,255,255,0.06)",
// //       surfaceHover: "rgba(255,255,255,0.1)",
// //       border: "rgba(14,165,233,0.15)",
// //       text: {
// //         primary: "#ffffff",
// //         secondary: "rgba(255,255,255,0.7)",
// //         muted: "rgba(255,255,255,0.4)",
// //         dim: "rgba(255,255,255,0.2)",
// //       },
// //     },
// //     // Status colors
// //     status: {
// //       online: "#22c55e",
// //       offline: "#64748b",
// //       busy: "#f59e0b",
// //       error: "#ef4444",
// //     },
// //     gradient: {
// //       header: ["#0a1628", "#0c4a6e", "#0369a1"],
// //       button: ["#0ea5e9", "#0284c7"],
// //     },
// //   },
// //   spacing: {
// //     xs: 4,
// //     sm: 8,
// //     md: 16,
// //     lg: 24,
// //     xl: 32,
// //     xxl: 48,
// //   },
// //   borderRadius: {
// //     sm: 8,
// //     md: 12,
// //     lg: 16,
// //     xl: 20,
// //     xxl: 24,
// //     full: 9999,
// //   },
// //   typography: {
// //     fontFamily: "Inter, sans-serif",
// //     sizes: {
// //       xs: 10,
// //       sm: 12,
// //       base: 14,
// //       lg: 16,
// //       xl: 18,
// //       "2xl": 22,
// //       "3xl": 26,
// //       "4xl": 32,
// //     },
// //     weights: {
// //       normal: "400",
// //       medium: "500",
// //       semibold: "600",
// //       bold: "700",
// //       extrabold: "800",
// //     },
// //   },
// // };
// // src/shared/constants/theme.ts

// export const theme = {
//   colors: {
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
//     // Light theme
//     light: {
//       background: "#ffffff",
//       surface: "#ffffff",
//       surfaceSecondary: "#f8fafc",
//       border: "#e2e8f0",
//       text: {
//         primary: "#0f172a",
//         secondary: "#475569",
//         muted: "#94a3b8",
//         dim: "#cbd5e1",
//       },
//       shadow: "0 2px 8px rgba(0,0,0,0.06)",
//     },
//     status: {
//       online: "#22c55e",
//       busy: "#f59e0b",
//       error: "#ef4444",
//       offline: "#94a3b8",
//     },
//     gradient: {
//       header: ["#0ea5e9", "#0284c7"],
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
//     sm: 4,
//     md: 8,
//     lg: 12,
//     xl: 16,
//     xxl: 20,
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

// // Helper to access light theme
// export const lightTheme = theme.colors.light;
export const colors = {
  // Donsol ocean
  primary: "#38BDF8",
  primaryDark: "#0284C7",
  primaryDeep: "#0369A1",
  primaryLight: "#E0F2FE",
  primarySoft: "#F0F9FF",

  // Backgrounds
  background: "#EAF7FF",
  backgroundDeep: "#DDF3FD",
  surface: "#F8FCFF",
  surfaceBright: "#FFFFFF",

  // Typography
  text: "#164E63",
  textStrong: "#0F3D4D",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",

  // Status
  success: "#22C55E",
  successSoft: "#DCFCE7",

  warning: "#F59E0B",
  warningSoft: "#FEF3C7",

  danger: "#EF4444",
  dangerSoft: "#FEE2E2",

  info: "#0EA5E9",
  infoSoft: "#E0F2FE",

  // Ocean
  ocean: "#0EA5E9",
  oceanLight: "#7DD3FC",
  oceanDeep: "#075985",

  // Clay shadows
  clayShadow: "#8CC7DD",
  clayHighlight: "#FFFFFF",

  // Neutral
  transparent: "transparent",
};

export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
    hero: 44,
  },

  lineHeight: {
    xs: 16,
    sm: 19,
    md: 22,
    lg: 26,
    xl: 30,
    xxl: 36,
    display: 44,
    hero: 52,
  },

  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },
};

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 32,
  pill: 999,
};

export const shadows = {
  clay: {
    shadowColor: colors.clayShadow,
    shadowOffset: {
      width: 8,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },

  claySmall: {
    shadowColor: colors.clayShadow,
    shadowOffset: {
      width: 5,
      height: 6,
    },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },

  floating: {
    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};
