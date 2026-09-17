import { BusFront } from "lucide-react-native";
import { Image, View } from "react-native";

import { colors } from "@/src/shared/constants/theme";

interface JeepneyImageProps {
  /** Preferred prop used by fleet/admin screens. */
  imageUrl?: string | null;
  /** Backward-compatible prop used by older screens. */
  uri?: string | null;
  size?: number;
  rounded?: number;
  iconSize?: number;
}

export default function JeepneyImage({
  imageUrl,
  uri,
  size = 56,
  rounded = 18,
  iconSize,
}: JeepneyImageProps) {
  const sourceUrl = (imageUrl ?? uri)?.trim() || null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#DBF0FA",
        borderWidth: 1,
        borderColor: "#FFFFFF",
      }}
    >
      {sourceUrl ? (
        <Image
          source={{ uri: sourceUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <BusFront
          size={iconSize ?? Math.max(22, Math.round(size * 0.48))}
          color={colors.primaryDark}
          strokeWidth={2.3}
        />
      )}
    </View>
  );
}
