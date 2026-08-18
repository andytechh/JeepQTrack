import {
  Bell,
  Bus,
  ChevronRight,
  FileBarChart,
  FileText,
  MapPin,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";

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
    route: "/admin/profile",
  },
  {
    label: "Settings",
    icon: Settings,
    route: "/admin/settings",
  },
];

const managementItems: DrawerItem[] = [
  {
    label: "Staff",
    icon: Users,
    route: "/admin/staff",
  },
  {
    label: "Jeepneys",
    icon: Bus,
    route: "/admin/jeepneys",
  },
  {
    label: "Terminals",
    icon: MapPin,
    route: "/admin/terminals",
  },
];

const monitoringItems: DrawerItem[] = [
  {
    label: "Reports",
    icon: FileBarChart,
    route: "/admin/reports",
  },
  {
    label: "Activity Logs",
    icon: FileText,
    route: "/admin/activity-logs",
  },
];

const systemItems: DrawerItem[] = [
  {
    label: "System Status",
    icon: ShieldCheck,
    route: "/admin/system-status",
  },
  {
    label: "Announcements",
    icon: Bell,
    route: "/admin/announcements",
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

      <View className="overflow-hidden rounded-[22px] border border-white/80 bg-clay-surface">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <Pressable
              key={item.route}
              onPress={() => onNavigate(item.route)}
              className="flex-row items-center px-4"
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

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: visible ? 0 : -390,
      useNativeDriver: true,
      speed: 25,
      bounciness: 2,
    }).start();
  }, [visible, translateX]);

  if (!visible) {
    return null;
  }

  const handleNavigate = (route: string) => {
    onClose();
    onNavigate(route);
  };

  return (
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
            className="h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-clay-surface"
          >
            <X size={19} color="#64748B" strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 30,
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
        </ScrollView>
      </Animated.View>
    </View>
  );
}
