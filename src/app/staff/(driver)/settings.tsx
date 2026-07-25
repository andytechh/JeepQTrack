// app/staff/(driver)/settings.tsx
import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Bus,
  ChevronRight,
  Edit2,
  Globe,
  Info,
  LogOut,
  Moon,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Card,
  LoadingSpinner,
  StatusBadge,
} from "../../../src/shared/components";
import { supabase } from "../../../src/shared/config/supabase";
import { AuthService } from "../../../src/shared/services/AuthService";
import { ChatService } from "../../../src/shared/services/ChatService";
import { useAuthStore } from "../../../src/shared/store/authStore";

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

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.uid)
        .single();

      if (userError) throw userError;
      setProfile(userData);

      // Get jeepney info if assigned
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
      console.error(" Profile fetch error:", error);
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
      console.error(" Update error:", error);
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
    Alert.alert("Logout", "Are you sure you want to logout?", [
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
    ]);
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ===== HEADER ===== */}
      <View className="bg-primary-500 px-4 pt-3 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-gray-500 text-xl font-semibold flex-1">
            Settings
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* ===== PROFILE SECTION ===== */}
        <View className="mb-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Profile
          </Text>
          <Card>
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center">
                <User size={32} color="#208AEF" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-gray-800 text-lg font-bold">
                  {profile?.display_name || "N/A"}
                </Text>
                <Text className="text-gray-500 text-sm">{profile?.email}</Text>
                <View className="flex-row items-center mt-1">
                  <StatusBadge
                    status={(profile?.role as any) || "inactive"}
                    size="sm"
                  />
                  {profile?.is_active && (
                    <Text className="text-green-500 text-xs ml-2">
                      ● Active
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                className="bg-primary-50 p-2 rounded-full"
                onPress={openEditModal}
              >
                <Edit2 size={18} color="#208AEF" />
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* ===== JEEPNEY INFO ===== */}
        {jeepneyInfo && (
          <View className="mb-4">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
              Jeepney Information
            </Text>
            <Card>
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
                  <Bus size={24} color="#3B82F6" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-800 font-bold">
                    {jeepneyInfo.plate_number}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Bracket {jeepneyInfo.bracket} • Capacity:{" "}
                    {jeepneyInfo.capacity}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <StatusBadge status={jeepneyInfo.status as any} size="sm" />
                  </View>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </View>
            </Card>
          </View>
        )}

        {/* ===== APP SETTINGS ===== */}
        <View className="mb-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            App Settings
          </Text>
          <Card>
            {/* Notifications */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Bell size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#D1D5DB", true: "#208AEF" }}
              />
            </View>

            {/* Dark Mode */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Moon size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#D1D5DB", true: "#208AEF" }}
              />
            </View>

            {/* Sound */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Bell size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Sound Effects</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: "#D1D5DB", true: "#208AEF" }}
              />
            </View>

            {/* Auto Refresh */}
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center">
                <Globe size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Auto Refresh</Text>
              </View>
              <Switch
                value={autoRefresh}
                onValueChange={setAutoRefresh}
                trackColor={{ false: "#D1D5DB", true: "#208AEF" }}
              />
            </View>
          </Card>
        </View>

        {/* ===== LANGUAGE ===== */}
        <View className="mb-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            Language & Region
          </Text>
          <Card>
            <TouchableOpacity className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center">
                <Globe size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Language</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-sm mr-2">{language}</Text>
                <ChevronRight size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* ===== ABOUT ===== */}
        <View className="mb-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
            About
          </Text>
          <Card>
            <TouchableOpacity className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Info size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Version</Text>
              </View>
              <Text className="text-gray-500 text-sm">1.0.0</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center">
                <Shield size={20} color="#6B7280" />
                <Text className="text-gray-700 ml-3">Privacy Policy</Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* ===== LOGOUT BUTTON ===== */}
        <TouchableOpacity
          className="bg-red-50 rounded-2xl p-4 flex-row items-center justify-center mb-8 border border-red-200"
          onPress={handleLogout}
        >
          <LogOut size={20} color="#EF4444" />
          <Text className="text-red-600 font-semibold ml-2">Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ===== EDIT PROFILE MODAL ===== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1">Full Name</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-4">
                <User size={18} color="#9CA3AF" />
                <TextInput
                  className="flex-1 py-3 ml-2 text-gray-800"
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1">
                Phone Number
              </Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-4">
                <Phone size={18} color="#9CA3AF" />
                <TextInput
                  className="flex-1 py-3 ml-2 text-gray-800"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity
              className={`bg-primary-500 py-3.5 rounded-xl flex-row items-center justify-center ${saving ? "opacity-50" : ""}`}
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
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
    </View>
  );
}
