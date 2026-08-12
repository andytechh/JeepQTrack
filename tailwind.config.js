// /** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
        },

        clay: {
          background: "#EAF7FF",
          surface: "#F8FCFF",
          highlight: "#FFFFFF",
          shadow: "#7CB8CF",
        },

        ink: {
          DEFAULT: "#164E63",
          dark: "#0F3D4D",
          muted: "#94A3B8",
          secondary: "#64748B",
        },

        success: {
          DEFAULT: "#22C55E",
          soft: "#DCFCE7",
        },

        warning: {
          DEFAULT: "#F59E0B",
          soft: "#FEF3C7",
        },

        danger: {
          DEFAULT: "#EF4444",
          soft: "#FEE2E2",
        },
      },

      borderRadius: {
        clay: "28px",
        "clay-lg": "32px",
        "clay-sm": "20px",
      },

      boxShadow: {
        clay: "7px 9px 18px rgba(124, 184, 207, 0.20)",
        "clay-sm": "4px 5px 10px rgba(124, 184, 207, 0.16)",
        "clay-floating": "0px 7px 15px rgba(2, 132, 199, 0.20)",
      },
    },
  },

  plugins: [],
};
