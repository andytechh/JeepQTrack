import { router } from "expo-router";
import {
  Bell,
  Bus,
  ChevronRight,
  FileBarChart,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { supabase } from "@/src/shared/config/supabase";

interface ClayAdminDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

interface DrawerItem {
  label: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  route: string;
}

const accountItems: DrawerItem[] = [
  {
    label: "Profile",
    icon: UserRound,
    route: "/staff/(admin)/profile",
  },
  {
    label: "Settings",
    icon: Settings,
    route: "/staff/(admin)/settings",
  },
];

const managementItems: DrawerItem[] = [
  {
    label: "Staffs",
    icon: Users,
    route: "/staff/(admin)/staffs",
  },
  {
    label: "Users",
    icon: Users,
    route: "/staff/(admin)/commuters",
  },
  {
    label: "Jeepneys",
    icon: Bus,
    route: "/staff/(admin)/jeepneys",
  },
  {
    label: "Terminals",
    icon: MapPin,
    route: "/staff/(admin)/terminals",
  },
];

const monitoringItems: DrawerItem[] = [
  {
    label: "Logs and Reports",
    icon: FileBarChart,
    route: "/staff/(admin)/monitoring",
  },
];

const systemItems: DrawerItem[] = [
  {
    label: "System Status",
    icon: ShieldCheck,
    route: "/staff/(admin)/system",
  },
  {
    label: "Announcements",
    icon: Bell,
    route: "/staff/(admin)/(tabs)/notifications",
  },
];

function DrawerSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: DrawerItem[];
  onNavigate: (route: string) => void;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[1px] text-ink-muted">
        {title}
      </Text>

      <View className="overflow-hidden rounded-[22px] border border-white/80 bg-clay-surface shadow-clay-sm">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <Pressable
              key={item.route}
              onPress={() => onNavigate(item.route)}
              className="flex-row items-center px-4 active:opacity-80"
              style={{
                minHeight: 58,
                borderBottomWidth: index < items.length - 1 ? 1 : 0,
                borderBottomColor: "rgba(148,163,184,0.12)",
              }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-ocean-100">
                <Icon size={18} color="#0EA5E9" strokeWidth={2.4} />
              </View>

              <Text className="ml-3 flex-1 text-[13px] font-bold text-ink-dark">
                {item.label}
              </Text>

              <ChevronRight size={17} color="#94A3B8" strokeWidth={2.3} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ClayAdminDrawer({
  visible,
  onClose,
  onNavigate,
}: ClayAdminDrawerProps) {
  const translateX = useRef(new Animated.Value(-390)).current;

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: visible ? 0 : -390,
      useNativeDriver: true,
      speed: 25,
      bounciness: 2,
    }).start();
  }, [visible, translateX]);

  if (!visible) {
    return (
      <>
        <ClayLogoutModal
          visible={logoutModalVisible}
          loggingOut={loggingOut}
          onCancel={() => setLogoutModalVisible(false)}
          onConfirm={async () => {
            try {
              setLoggingOut(true);

              const { error } = await supabase.auth.signOut();

              if (error) {
                throw error;
              }

              setLogoutModalVisible(false);
              onClose();

              router.replace("/staff/login");
            } catch (error) {
              console.error("Logout error:", error);

              setLoggingOut(false);
            }
          }}
        />
      </>
    );
  }

  const handleNavigate = (route: string) => {
    onClose();
    onNavigate(route);
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  return (
    <>
      <View
        className="absolute inset-0 z-50"
        style={{
          elevation: 50,
        }}
      >
        <Pressable onPress={onClose} className="absolute inset-0 bg-black/25" />

        <Animated.View
          className="h-full bg-clay-background px-5 pb-8 pt-14"
          style={{
            width: "86%",
            maxWidth: 390,
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOffset: {
              width: 8,
              height: 0,
            },
            shadowOpacity: 0.12,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 top-0 h-[2px] bg-white"
          />

          {/* Header */}

          <View className="mb-6 flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-[17px] bg-ocean-100">
              <ShieldCheck size={24} color="#0EA5E9" strokeWidth={2.5} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[20px] font-extrabold text-ink-dark">
                Admin Menu
              </Text>

              <Text className="mt-0.5 text-[11px] font-medium text-ink-muted">
                Management & control
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-clay-surface shadow-clay-sm"
            >
              <X size={19} color="#64748B" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Content */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 75,
            }}
          >
            <DrawerSection
              title="Account"
              items={accountItems}
              onNavigate={handleNavigate}
            />

            <DrawerSection
              title="Management"
              items={managementItems}
              onNavigate={handleNavigate}
            />

            <DrawerSection
              title="Monitoring"
              items={monitoringItems}
              onNavigate={handleNavigate}
            />

            <DrawerSection
              title="System"
              items={systemItems}
              onNavigate={handleNavigate}
            />

            {/* Logout */}

            <View className="mb-1 mt-1">
              <Pressable
                onPress={handleLogout}
                className="flex-row items-center rounded-[22px] border border-red-100 bg-red-50 px-4 shadow-clay-sm active:opacity-80"
                style={{
                  minHeight: 60,
                }}
              >
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-red-100">
                  <LogOut size={18} color="#DC2626" strokeWidth={2.4} />
                </View>

                <Text className="ml-3 flex-1 text-[13px] font-bold text-red-700">
                  Logout
                </Text>

                <ChevronRight size={17} color="#F87171" strokeWidth={2.3} />
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      <ClayLogoutModal
        visible={logoutModalVisible}
        loggingOut={loggingOut}
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={async () => {
          try {
            setLoggingOut(true);

            const { error } = await supabase.auth.signOut();

            if (error) {
              throw error;
            }

            setLogoutModalVisible(false);
            onClose();

            router.replace("/staff/login");
          } catch (error) {
            console.error("Logout error:", error);

            setLoggingOut(false);
          }
        }}
      />
    </>
  );
}

/* ================================================================
   CLAY LOGOUT MODAL
================================================================ */

function ClayLogoutModal({
  visible,
  loggingOut,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  loggingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!loggingOut) {
          onCancel();
        }
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/35 px-6">
        <View
          className="w-full max-w-[370px] rounded-[32px] border border-white/90 bg-clay-surface p-6 shadow-clay-floating"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: {
              width: 0,
              height: 12,
            },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 25,
          }}
        >
          {/* Top icon */}

          <View className="items-center">
            <View className="h-[68px] w-[68px] items-center justify-center rounded-[23px] border border-red-100 bg-red-50 shadow-clay-sm">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-[17px] bg-red-100">
                <LogOut size={24} color="#DC2626" strokeWidth={2.4} />
              </View>
            </View>

            <Text className="mt-5 text-center text-[21px] font-extrabold text-ink-dark">
              Sign out?
            </Text>

            <Text className="mt-2 text-center text-[12px] leading-[19px] text-ink-secondary">
              Are you sure you want to sign out of the Smart Queue admin
              application?
            </Text>
          </View>

          {/* Buttons */}

          <View className="mt-7 flex-row gap-3">
            <Pressable
              disabled={loggingOut}
              onPress={onCancel}
              className="h-[50px] flex-1 items-center justify-center rounded-full border border-ocean-200 bg-white shadow-clay-sm active:opacity-80"
            >
              <Text className="text-[13px] font-extrabold text-ocean-700">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={loggingOut}
              onPress={onConfirm}
              className="h-[50px] flex-1 flex-row items-center justify-center rounded-full border border-red-500 bg-red-500 shadow-clay-sm active:opacity-80"
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <LogOut size={16} color="#FFFFFF" strokeWidth={2.5} />

                  <Text className="ml-2 text-[13px] font-extrabold text-white">
                    Sign Out
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
