// app/staff/(admin)/(tabs)/live-map.tsx
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapView } from "../../../../src/shared/components/map/MapView";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { useDispatcherGPS } from "../../../../src/shared/hooks/useDispatcherGPS";

export default function AdminLiveMap() {
  const { isDark } = useTheme();
  const { markers, loading, error, refresh } = useDispatcherGPS();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <View className="flex-1">
        <MapView markers={markers} showControls enableRealtime />
      </View>
    </SafeAreaView>
  );
}
