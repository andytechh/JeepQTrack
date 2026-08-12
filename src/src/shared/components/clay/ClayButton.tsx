import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text } from "react-native";

interface ClayButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ClayButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  className = "",
}: ClayButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
      }}
    >
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        className={`min-h-[58px] items-center justify-center rounded-full border border-white/80 bg-ocean-400 shadow-clay-floating ${
          disabled || loading ? "opacity-50" : ""
        } ${className}`}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-[15px] font-bold text-white">{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
