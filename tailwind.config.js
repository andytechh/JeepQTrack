/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Light tokens
        "light-background": theme.colors.light.background,
        "light-surface": theme.colors.light.surface,
        "light-surface-secondary": theme.colors.light.surfaceSecondary,
        "light-border": theme.colors.light.border,
        "light-text-primary": theme.colors.light.text.primary,
        "light-text-secondary": theme.colors.light.text.secondary,
        "light-text-muted": theme.colors.light.text.muted,
        "light-text-dim": theme.colors.light.text.dim,

        // Dark tokens – from your theme.colors.dark
        "dark-background": theme.colors.dark.background,
        "dark-surface": theme.colors.dark.surface,
        "dark-surface-light": theme.colors.dark.surfaceLight,
        "dark-border": theme.colors.dark.border,
        "dark-text-primary": theme.colors.dark.text.primary,
        "dark-text-secondary": theme.colors.dark.text.secondary,
        "dark-text-muted": theme.colors.dark.text.muted,
        "dark-text-dim": theme.colors.dark.text.dim,
      },
    },
  },
  plugins: [],
};
