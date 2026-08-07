import { useTheme } from "../context/ThemeContext";

export function useAppTheme() {
  const { isDark, toggleTheme } = useTheme();
  const colors = {
    background: isDark ? "bg-slate-600" : "bg-slate-50",
    surface: isDark ? "bg-slate-700" : "bg-white",
    text: isDark ? "text-white" : "text-slate-900",
    border: isDark ? "border-slate-400" : "border-slate-200",
  };
  return { colors, isDark, toggleTheme };
}
