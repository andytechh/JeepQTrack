// app/staff/(driver)/settings.tsx
import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Bus,
  ChevronRight,
  Edit2,
  Info,
  Languages,
  LogOut,
  Moon,
  Phone,
  RefreshCw,
  Save,
  Shield,
  User,
  Volume2,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../src/shared/config/supabase";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { useSettings } from "../../../../src/shared/hooks/useSettings";
import { AuthService } from "../../../../src/shared/services/AuthService";
import { ChatService } from "../../../../src/shared/services/ChatService";
import { useAuthStore } from "../../../../src/shared/store/authStore";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone_number: string | null;
  role: string;
  jeepney_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface JeepneyInfo {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number;
  status: string;
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, resetSettings } = useSettings();

  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jeepneyInfo, setJeepneyInfo] = useState<JeepneyInfo | null>(null);

  // Edit profile modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Language modal
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const languages = ["English", "Tagalog", "Bicolano", "Cebuano"];

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.uid)
        .single();
      if (userError) throw userError;
      setProfile(userData);

      if (userData?.role === "driver" && userData?.jeepney_id) {
        const { data: jeepneyData, error: jeepneyError } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("id", userData.jeepney_id)
          .single();
        if (!jeepneyError && jeepneyData) {
          setJeepneyInfo(jeepneyData);
        }
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          display_name: editName.trim(),
          phone_number: editPhone.trim() || null,
        })
        .eq("id", user?.uid);
      if (error) throw error;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: editName.trim(),
              phone_number: editPhone.trim() || null,
            }
          : null,
      );
      Alert.alert("Success", "Profile updated successfully");
      setEditModalVisible(false);
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    setEditName(profile?.display_name || "");
    setEditPhone(profile?.phone_number || "");
    setEditModalVisible(true);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AuthService.signOut();
            logout();
            router.replace("/staff/login");
            ChatService.clearCache();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleToggleNotifications = (value: boolean) => {
    updateSettings({ notifications: value });
  };

  const handleToggleSound = (value: boolean) => {
    updateSettings({ soundEnabled: value });
  };

  const handleToggleAutoRefresh = (value: boolean) => {
    updateSettings({ autoRefresh: value });
  };

  const handleLanguageSelect = (lang: string) => {
    updateSettings({ language: lang });
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetSettings();
            Alert.alert("Success", "Settings reset to defaults");
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-slate-900" : "bg-slate-50"
        }`}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text
          className={`mt-4 text-sm ${
            isDark ? "text-slate-400" : "text-slate-400"
          }`}
        >
          Loading settings...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#0f172a" : "#f8fafc"}
      />

      {/* ─── Header ────────────────────────────────────────────────── */}
      <View
        className={`flex-row items-center px-4 py-3 border-b ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-1 mr-3"
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={isDark ? "#e2e8f0" : "#0f172a"} />
        </TouchableOpacity>
        <Text
          className={`flex-1 text-xl font-bold ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Settings
        </Text>
        <TouchableOpacity onPress={handleResetSettings} className="p-1">
          <RefreshCw size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile ────────────────────────────────────────────── */}
        <View className="mb-6">
          <Text
            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}
          >
            Profile
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openEditModal}
            className={`rounded-xl p-4 border ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            } shadow-sm`}
          >
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-full bg-sky-500 items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {profile?.display_name?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <Text
                  className={`text-base font-bold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {profile?.display_name || "N/A"}
                </Text>
                <Text
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {profile?.email}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      profile?.role === "driver"
                        ? isDark
                          ? "bg-sky-900"
                          : "bg-sky-100"
                        : isDark
                          ? "bg-slate-700"
                          : "bg-slate-100"
                    }`}
                  >
                    <Text
                      className={`text-xs capitalize ${
                        profile?.role === "driver"
                          ? isDark
                            ? "text-sky-300"
                            : "text-sky-600"
                          : isDark
                            ? "text-slate-300"
                            : "text-slate-500"
                      }`}
                    >
                      {profile?.role || "staff"}
                    </Text>
                  </View>
                  {profile?.is_active && (
                    <View className="flex-row items-center ml-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                      <Text
                        className={`text-xs ${
                          isDark ? "text-slate-400" : "text-slate-400"
                        }`}
                      >
                        Active
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isDark ? "bg-slate-700" : "bg-sky-50"
                }`}
              >
                <Edit2 size={18} color="#0ea5e9" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Jeepney Info (driver only) ────────────────────────── */}
        {profile?.role === "driver" && jeepneyInfo && (
          <View className="mb-6">
            <Text
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                isDark ? "text-slate-400" : "text-slate-400"
              }`}
            >
              Jeepney Information
            </Text>
            <View
              className={`rounded-xl p-4 border ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-slate-200"
              } shadow-sm`}
            >
              <View className="flex-row items-center">
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center ${
                    isDark ? "bg-slate-700" : "bg-sky-50"
                  }`}
                >
                  <Bus size={24} color="#0ea5e9" />
                </View>
                <View className="flex-1 ml-3">
                  <Text
                    className={`text-base font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {jeepneyInfo.plate_number}
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Bracket {jeepneyInfo.bracket} • Capacity:{" "}
                    {jeepneyInfo.capacity}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        jeepneyInfo.status === "active"
                          ? isDark
                            ? "bg-green-900"
                            : "bg-green-100"
                          : isDark
                            ? "bg-red-900"
                            : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-xs capitalize ${
                          jeepneyInfo.status === "active"
                            ? isDark
                              ? "text-green-300"
                              : "text-green-600"
                            : isDark
                              ? "text-red-300"
                              : "text-red-600"
                        }`}
                      >
                        {jeepneyInfo.status || "unknown"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── App Settings ────────────────────────────────────────── */}
        <View className="mb-6">
          <Text
            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}
          >
            App Settings
          </Text>
          <View
            className={`rounded-xl overflow-hidden border ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            {/* Notifications */}
            <View
              className={`flex-row items-center justify-between px-4 py-3.5 ${
                isDark ? "border-slate-700" : "border-slate-100"
              } border-b`}
            >
              <View className="flex-row items-center">
                <Bell size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text
                  className={`ml-3 text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Push Notifications
                </Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: isDark ? "#475569" : "#e2e8f0",
                  true: "#0ea5e9",
                }}
                thumbColor={
                  settings.notifications
                    ? "#ffffff"
                    : isDark
                      ? "#94a3b8"
                      : "#94a3b8"
                }
              />
            </View>

            {/* Dark Mode */}
            <View
              className={`flex-row items-center justify-between px-4 py-3.5 ${
                isDark ? "border-slate-700" : "border-slate-100"
              } border-b`}
            >
              <View className="flex-row items-center">
                <Moon size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text
                  className={`ml-3 text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => toggleTheme()}
                trackColor={{
                  false: isDark ? "#475569" : "#e2e8f0",
                  true: "#0ea5e9",
                }}
                thumbColor={isDark ? "#ffffff" : "#94a3b8"}
              />
            </View>

            {/* Sound Effects */}
            <View
              className={`flex-row items-center justify-between px-4 py-3.5 ${
                isDark ? "border-slate-700" : "border-slate-100"
              } border-b`}
            >
              <View className="flex-row items-center">
                <Volume2 size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text
                  className={`ml-3 text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Sound Effects
                </Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={handleToggleSound}
                trackColor={{
                  false: isDark ? "#475569" : "#e2e8f0",
                  true: "#0ea5e9",
                }}
                thumbColor={
                  settings.soundEnabled
                    ? "#ffffff"
                    : isDark
                      ? "#94a3b8"
                      : "#94a3b8"
                }
              />
            </View>

            {/* Auto Refresh */}
            <View
              className={`flex-row items-center justify-between px-4 py-3.5 ${
                isDark ? "border-slate-700" : "border-slate-100"
              }`}
            >
              <View className="flex-row items-center">
                <RefreshCw size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text
                  className={`ml-3 text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Auto Refresh
                </Text>
              </View>
              <Switch
                value={settings.autoRefresh}
                onValueChange={handleToggleAutoRefresh}
                trackColor={{
                  false: isDark ? "#475569" : "#e2e8f0",
                  true: "#0ea5e9",
                }}
                thumbColor={
                  settings.autoRefresh
                    ? "#ffffff"
                    : isDark
                      ? "#94a3b8"
                      : "#94a3b8"
                }
              />
            </View>
          </View>
        </View>

        {/* ─── Language ────────────────────────────────────────────── */}
        <View className="mb-6">
          <Text
            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}
          >
            Language & Region
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
            className={`rounded-xl p-4 flex-row items-center justify-between border ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            } shadow-sm`}
          >
            <View className="flex-row items-center">
              <Languages size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
              <Text
                className={`ml-3 text-sm ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Language
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text
                className={`text-sm mr-2 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {settings.language}
              </Text>
              <ChevronRight size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── About ────────────────────────────────────────────────── */}
        <View className="mb-6">
          <Text
            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}
          >
            About
          </Text>
          <View
            className={`rounded-xl overflow-hidden border ${
              isDark
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <View
              className={`flex-row items-center justify-between px-4 py-3.5 ${
                isDark ? "border-slate-700" : "border-slate-100"
              } border-b`}
            >
              <View className="flex-row items-center">
                <Info size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text
                  className={`ml-3 text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Version
                </Text>
              </View>
              <Text
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                1.0.0
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <View className="flex-row items-center">
                <Shield size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text
                  className={`ml-3 text-sm ${
                    isDark ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Privacy Policy
                </Text>
              </View>
              <ChevronRight size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Logout ────────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          className={`rounded-xl p-4 flex-row items-center justify-center mb-8 border ${
            isDark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"
          }`}
          onPress={handleLogout}
        >
          <LogOut size={20} color={isDark ? "#f87171" : "#ef4444"} />
          <Text
            className={`font-semibold ml-2 ${
              isDark ? "text-red-400" : "text-red-500"
            }`}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Language Modal ────────────────────────────────────────── */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className={`rounded-t-3xl p-6 ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Select Language
              </Text>
              <TouchableOpacity
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isDark ? "bg-slate-700" : "bg-slate-100"
                }`}
                onPress={() => setLanguageModalVisible(false)}
              >
                <X size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
              </TouchableOpacity>
            </View>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between py-3.5 ${
                  isDark ? "border-slate-700" : "border-slate-100"
                } border-b`}
                onPress={() => {
                  handleLanguageSelect(lang);
                  setLanguageModalVisible(false);
                }}
              >
                <Text
                  className={`text-base ${
                    settings.language === lang
                      ? "text-sky-500"
                      : isDark
                        ? "text-slate-200"
                        : "text-slate-700"
                  }`}
                >
                  {lang}
                </Text>
                {settings.language === lang && (
                  <View className="w-5 h-5 rounded-full bg-sky-500 items-center justify-center">
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ─── Edit Profile Modal ───────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className={`rounded-t-3xl p-6 ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                className={`text-xl font-bold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Edit Profile
              </Text>
              <TouchableOpacity
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isDark ? "bg-slate-700" : "bg-slate-100"
                }`}
                onPress={() => setEditModalVisible(false)}
              >
                <X size={20} color={isDark ? "#94a3b8" : "#94a3b8"} />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text
                className={`text-sm font-medium mb-1.5 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Full Name
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark
                    ? "bg-slate-700 border-slate-600"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <User size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <TextInput
                  className={`flex-1 py-3 ml-2 text-base ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                />
              </View>
            </View>

            <View className="mb-6">
              <Text
                className={`text-sm font-medium mb-1.5 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Phone Number
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark
                    ? "bg-slate-700 border-slate-600"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <Phone size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <TextInput
                  className={`flex-1 py-3 ml-2 text-base ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              className="bg-sky-500 rounded-xl py-3.5 flex-row items-center justify-center"
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Save size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Update Profile
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
