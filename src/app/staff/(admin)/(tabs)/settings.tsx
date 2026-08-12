// app/staff/(admin)/(tabs)/settings.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Card } from "../../../../src/shared/components/ui/Card";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  AdminService,
  AppSettings,
} from "../../../../src/shared/services/AdminService";
import { useAuthStore } from "../../../../src/shared/store/authStore";

export default function AdminSettings() {
  const { isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    base_fare: 13,
    fare_per_km: 1.8,
    max_queue_size: 20,
    maintenance_mode: false,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminService.getSettings();
      setSettings(data);
    } catch (err) {
      console.warn("Could not load app settings, using defaults", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await AdminService.updateSettings(settings);
      Toast.show({ type: "success", text1: "Settings saved" });
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  };

  if (loading)
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card className="p-4 mb-4">
          <Text
            className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Account
          </Text>
          <Text
            className={`text-base font-semibold mt-1 ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {user?.displayName || user?.email}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {user?.role}
          </Text>
        </Card>

        <Card className="p-4 mb-4">
          <Text
            className={`text-sm font-semibold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Fare Settings
          </Text>
          <View className="gap-3">
            <SettingField
              label="Base fare (₱)"
              value={String(settings.base_fare)}
              onChangeText={(t) =>
                setSettings((s) => ({ ...s, base_fare: Number(t) || 0 }))
              }
              isDark={isDark}
            />
            <SettingField
              label="Fare per km (₱)"
              value={String(settings.fare_per_km)}
              onChangeText={(t) =>
                setSettings((s) => ({ ...s, fare_per_km: Number(t) || 0 }))
              }
              isDark={isDark}
            />
            <SettingField
              label="Max queue size"
              value={String(settings.max_queue_size)}
              onChangeText={(t) =>
                setSettings((s) => ({ ...s, max_queue_size: Number(t) || 0 }))
              }
              isDark={isDark}
              last
            />
          </View>
        </Card>

        <Card className="p-4 mb-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Maintenance mode
            </Text>
            <Text
              className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Temporarily blocks commuter and driver access
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              setSettings((s) => ({
                ...s,
                maintenance_mode: !s.maintenance_mode,
              }))
            }
            className={`w-11 h-7 rounded-full p-1 ${settings.maintenance_mode ? "bg-red-500" : "bg-slate-300"}`}
          >
            <View
              className={`w-5 h-5 rounded-full bg-white ${settings.maintenance_mode ? "ml-4" : ""}`}
            />
          </TouchableOpacity>
        </Card>

        <TouchableOpacity
          onPress={handleSaveSettings}
          disabled={saving}
          className={`py-3.5 rounded-xl items-center ${saving ? "bg-slate-400" : "bg-sky-500"}`}
        >
          <Text className="text-white font-semibold">
            {saving ? "Saving..." : "Save System Settings"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="mt-6 py-3.5 rounded-xl items-center border border-red-200 bg-red-50"
        >
          <Text className="text-red-500 font-semibold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingField({
  label,
  value,
  onChangeText,
  isDark = false,
  last = false,
}) {
  return (
    <View className={last ? "" : "mb-3"}>
      <Text
        className={`text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
      />
    </View>
  );
}
