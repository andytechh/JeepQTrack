// app/staff/(driver)/settings.tsx
import { LinearGradient } from "expo-linear-gradient";
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
  X
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
import { theme } from "../../../../src/shared/constants/theme";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jeepneyInfo, setJeepneyInfo] = useState<JeepneyInfo | null>(null);

  // Edit profile modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Settings state
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [language, setLanguage] = useState("English");
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

      if (userData?.jeepney_id) {
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

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.colors.dark.background }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text
          className="mt-4 text-sm"
          style={{ color: theme.colors.dark.text.muted }}
        >
          Loading settings...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.dark.background }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.dark.background}
      />

      {/* ===== HEADER ===== */}
      <LinearGradient
        colors={theme.colors.gradient.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        className="px-4 pt-4 pb-4"
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-bold text-white">
            Settings
          </Text>
          <View className="w-10" />
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.colors.dark.background }}
      >
        {/* ===== PROFILE SECTION ===== */}
        <View className="mb-6">
          <Text
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: theme.colors.dark.text.muted }}
          >
            Profile
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openEditModal}
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.colors.dark.surface,
              borderWidth: 1,
              borderColor: theme.colors.dark.border,
            }}
          >
            <View className="flex-row items-center">
              <LinearGradient
                colors={theme.colors.gradient.button}
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ borderRadius: theme.borderRadius.full }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text className="text-white text-xl font-bold">
                  {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </LinearGradient>
              <View className="flex-1 ml-3">
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  {profile?.display_name || "N/A"}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: theme.colors.dark.text.secondary }}
                >
                  {profile?.email}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        profile?.role === "driver"
                          ? `${theme.colors.primary[500]}30`
                          : `${theme.colors.status.busy}30`,
                    }}
                  >
                    <Text
                      className="text-xs capitalize"
                      style={{
                        color:
                          profile?.role === "driver"
                            ? theme.colors.primary[400]
                            : theme.colors.status.busy,
                      }}
                    >
                      {profile?.role || "staff"}
                    </Text>
                  </View>
                  {profile?.is_active && (
                    <View className="flex-row items-center ml-2">
                      <View
                        className="w-1.5 h-1.5 rounded-full mr-1"
                        style={{ backgroundColor: theme.colors.status.online }}
                      />
                      <Text
                        className="text-xs"
                        style={{ color: theme.colors.dark.text.muted }}
                      >
                        Active
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: `${theme.colors.primary[500]}20` }}
              >
                <Edit2 size={18} color={theme.colors.primary[400]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ===== JEEPNEY INFO ===== */}
        {jeepneyInfo && (
          <View className="mb-6">
            <Text
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: theme.colors.dark.text.muted }}
            >
              Jeepney Information
            </Text>
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: theme.colors.dark.surface,
                borderWidth: 1,
                borderColor: theme.colors.dark.border,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${theme.colors.primary[500]}20` }}
                >
                  <Bus size={24} color={theme.colors.primary[400]} />
                </View>
                <View className="flex-1 ml-3">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.colors.dark.text.primary }}
                  >
                    {jeepneyInfo.plate_number}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.dark.text.secondary }}
                  >
                    Bracket {jeepneyInfo.bracket} • Capacity:{" "}
                    {jeepneyInfo.capacity}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          jeepneyInfo.status === "active"
                            ? `${theme.colors.status.online}30`
                            : `${theme.colors.status.busy}30`,
                      }}
                    >
                      <Text
                        className="text-xs capitalize"
                        style={{
                          color:
                            jeepneyInfo.status === "active"
                              ? theme.colors.status.online
                              : theme.colors.status.busy,
                        }}
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

        {/* ===== APP SETTINGS ===== */}
        <View className="mb-6">
          <Text
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: theme.colors.dark.text.muted }}
          >
            App Settings
          </Text>
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: theme.colors.dark.surface,
              borderWidth: 1,
              borderColor: theme.colors.dark.border,
            }}
          >
            {/* Notifications */}
            <View
              className="flex-row items-center justify-between px-4 py-3.5"
              style={{
                borderBottomWidth: 1,
                borderColor: theme.colors.dark.border,
              }}
            >
              <View className="flex-row items-center">
                <Bell size={20} color={theme.colors.dark.text.muted} />
                <Text
                  className="ml-3 text-sm"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  Push Notifications
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: theme.colors.dark.text.dim,
                  true: theme.colors.primary[500],
                }}
                thumbColor={notifications ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>

            {/* Dark Mode */}
            <View
              className="flex-row items-center justify-between px-4 py-3.5"
              style={{
                borderBottomWidth: 1,
                borderColor: theme.colors.dark.border,
              }}
            >
              <View className="flex-row items-center">
                <Moon size={20} color={theme.colors.dark.text.muted} />
                <Text
                  className="ml-3 text-sm"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: theme.colors.dark.text.dim,
                  true: theme.colors.primary[500],
                }}
                thumbColor={darkMode ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>

            {/* Sound Effects */}
            <View
              className="flex-row items-center justify-between px-4 py-3.5"
              style={{
                borderBottomWidth: 1,
                borderColor: theme.colors.dark.border,
              }}
            >
              <View className="flex-row items-center">
                <Volume2 size={20} color={theme.colors.dark.text.muted} />
                <Text
                  className="ml-3 text-sm"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  Sound Effects
                </Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{
                  false: theme.colors.dark.text.dim,
                  true: theme.colors.primary[500],
                }}
                thumbColor={soundEnabled ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>

            {/* Auto Refresh */}
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <View className="flex-row items-center">
                <RefreshCw size={20} color={theme.colors.dark.text.muted} />
                <Text
                  className="ml-3 text-sm"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  Auto Refresh
                </Text>
              </View>
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{
                  false: theme.colors.dark.text.dim,
                  true: theme.colors.primary[500],
                }}
                thumbColor={autoRefresh ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* ===== LANGUAGE ===== */}
        <View className="mb-6">
          <Text
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: theme.colors.dark.text.muted }}
          >
            Language & Region
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
            className="rounded-2xl p-4 flex-row items-center justify-between"
            style={{
              backgroundColor: theme.colors.dark.surface,
              borderWidth: 1,
              borderColor: theme.colors.dark.border,
            }}
          >
            <View className="flex-row items-center">
              <Languages size={20} color={theme.colors.dark.text.muted} />
              <Text
                className="ml-3 text-sm"
                style={{ color: theme.colors.dark.text.primary }}
              >
                Language
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text
                className="text-sm mr-2"
                style={{ color: theme.colors.dark.text.muted }}
              >
                {language}
              </Text>
              <ChevronRight size={18} color={theme.colors.dark.text.muted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ===== ABOUT ===== */}
        <View className="mb-6">
          <Text
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: theme.colors.dark.text.muted }}
          >
            About
          </Text>
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: theme.colors.dark.surface,
              borderWidth: 1,
              borderColor: theme.colors.dark.border,
            }}
          >
            <View
              className="flex-row items-center justify-between px-4 py-3.5"
              style={{
                borderBottomWidth: 1,
                borderColor: theme.colors.dark.border,
              }}
            >
              <View className="flex-row items-center">
                <Info size={20} color={theme.colors.dark.text.muted} />
                <Text
                  className="ml-3 text-sm"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  Version
                </Text>
              </View>
              <Text
                className="text-sm"
                style={{ color: theme.colors.dark.text.muted }}
              >
                1.0.0
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <View className="flex-row items-center">
                <Shield size={20} color={theme.colors.dark.text.muted} />
                <Text
                  className="ml-3 text-sm"
                  style={{ color: theme.colors.dark.text.primary }}
                >
                  Privacy Policy
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.dark.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== LOGOUT BUTTON ===== */}
        <TouchableOpacity
          activeOpacity={0.8}
          className="rounded-2xl p-4 flex-row items-center justify-center mb-8"
          style={{
            backgroundColor: `${theme.colors.status.error}15`,
            borderWidth: 1,
            borderColor: `${theme.colors.status.error}30`,
          }}
          onPress={handleLogout}
        >
          <LogOut size={20} color={theme.colors.status.error} />
          <Text
            className="font-semibold ml-2"
            style={{ color: theme.colors.status.error }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== LANGUAGE MODAL ===== */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: theme.colors.dark.surface }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className="text-lg font-bold"
                style={{ color: theme.colors.dark.text.primary }}
              >
                Select Language
              </Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.colors.dark.surfaceLight }}
                onPress={() => setLanguageModalVisible(false)}
              >
                <X size={20} color={theme.colors.dark.text.muted} />
              </TouchableOpacity>
            </View>

            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                activeOpacity={0.7}
                className="flex-row items-center justify-between py-3.5"
                style={{
                  borderBottomWidth: 1,
                  borderColor: theme.colors.dark.border,
                }}
                onPress={() => {
                  setLanguage(lang);
                  setLanguageModalVisible(false);
                }}
              >
                <Text
                  className="text-base"
                  style={{
                    color:
                      language === lang
                        ? theme.colors.primary[400]
                        : theme.colors.dark.text.primary,
                  }}
                >
                  {lang}
                </Text>
                {language === lang && (
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.colors.primary[500] }}
                  >
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ===== EDIT PROFILE MODAL ===== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: theme.colors.dark.surface }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                className="text-xl font-bold"
                style={{ color: theme.colors.dark.text.primary }}
              >
                Edit Profile
              </Text>
              <TouchableOpacity
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.colors.dark.surfaceLight }}
                onPress={() => setEditModalVisible(false)}
              >
                <X size={20} color={theme.colors.dark.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View className="mb-4">
              <Text
                className="text-sm font-medium mb-1.5"
                style={{ color: theme.colors.dark.text.secondary }}
              >
                Full Name
              </Text>
              <View
                className="flex-row items-center rounded-xl px-4"
                style={{
                  backgroundColor: theme.colors.dark.surfaceLight,
                  borderWidth: 1,
                  borderColor: theme.colors.dark.border,
                }}
              >
                <User size={18} color={theme.colors.dark.text.muted} />
                <TextInput
                  className="flex-1 py-3 ml-2 text-base"
                  style={{ color: theme.colors.dark.text.primary }}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.dark.text.muted}
                />
              </View>
            </View>

            {/* Phone */}
            <View className="mb-6">
              <Text
                className="text-sm font-medium mb-1.5"
                style={{ color: theme.colors.dark.text.secondary }}
              >
                Phone Number
              </Text>
              <View
                className="flex-row items-center rounded-xl px-4"
                style={{
                  backgroundColor: theme.colors.dark.surfaceLight,
                  borderWidth: 1,
                  borderColor: theme.colors.dark.border,
                }}
              >
                <Phone size={18} color={theme.colors.dark.text.muted} />
                <TextInput
                  className="flex-1 py-3 ml-2 text-base"
                  style={{ color: theme.colors.dark.text.primary }}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.colors.dark.text.muted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Update Button */}
            <LinearGradient
              colors={theme.colors.gradient.button}
              className="rounded-xl overflow-hidden"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity
                className="py-3.5 flex-row items-center justify-center"
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
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
