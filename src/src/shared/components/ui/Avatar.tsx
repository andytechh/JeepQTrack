import { Image, Text, View } from "react-native";

type AvatarProps = {
  size?: "sm" | "default" | "lg";
  fallback?: string;
  uri?: string;
  className?: string;
};

export function Avatar({
  size = "default",
  fallback = "?",
  uri,
  className = "",
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    default: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <View
      className={`${sizeClasses[size]} rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center overflow-hidden ${className}`}
    >
      {uri ? (
        <Image source={{ uri }} className="w-full h-full rounded-full" />
      ) : (
        <Text
          className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${size === "sm" ? "text-[10px]" : ""}`}
        >
          {fallback?.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
