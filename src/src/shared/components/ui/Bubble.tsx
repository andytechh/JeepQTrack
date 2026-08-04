import React from "react";
import { Text, View } from "react-native";

type BubbleVariant =
  | "default"
  | "muted"
  | "secondary"
  | "tinted"
  | "outline"
  | "ghost"
  | "destructive";
type BubbleAlign = "start" | "end";

interface BubbleProps {
  children: React.ReactNode;
  variant?: BubbleVariant;
  align?: BubbleAlign;
  className?: string;
}

const variantClasses: Record<BubbleVariant, string> = {
  default: "bg-sky-500 dark:bg-sky-600 text-white",
  muted: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white",
  secondary: "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white",
  tinted: "bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100",
  outline:
    "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white",
  ghost: "bg-transparent text-slate-900 dark:text-white",
  destructive: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
};

export function Bubble({
  children,
  variant = "default",
  align = "start",
  className = "",
}: BubbleProps) {
  return (
    <View
      className={`rounded-xl px-3 py-2 max-w-[80%] ${variantClasses[variant]} ${
        align === "end" ? "self-end" : "self-start"
      } ${className}`}
    >
      {typeof children === "string" ? (
        <Text className="text-sm leading-relaxed">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
