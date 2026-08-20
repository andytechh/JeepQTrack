import { router } from "expo-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  Server,
  Smartphone,
  Users,
  Wifi,
  XCircle,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";
import {
  SystemService,
  SystemServiceStatus,
  useSystemStatus,
} from "@/src/shared/hooks/admin/useSystemStatus";

function formatCheckedAt(value: string | null) {
  if (!value) {
    return "Not checked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not checked";
  }

  return date.toLocaleString();
}

function getStatusPresentation(status: SystemServiceStatus) {
  switch (status) {
    case "operational":
      return {
        label: "Operational",
        background: "#ECFDF5",
        color: "#047857",
        icon: CheckCircle2,
      };

    case "degraded":
      return {
        label: "Degraded",
        background: "#FFFBEB",
        color: "#B45309",
        icon: AlertTriangle,
      };

    case "offline":
      return {
        label: "Offline",
        background: "#FEF2F2",
        color: "#DC2626",
        icon: XCircle,
      };
  }
}

function getServiceIcon(serviceId: string) {
  switch (serviceId) {
    case "supabase":
      return Database;

    case "users":
      return Users;

    case "jeepneys":
      return Activity;

    case "notifications":
      return Smartphone;

    default:
      return Server;
  }
}

export default function SystemStatusScreen() {
  const { systemStatus, loading, refreshing, error, refresh } =
    useSystemStatus();

  const overallPresentation = useMemo(
    () => getStatusPresentation(systemStatus.overall),
    [systemStatus.overall],
  );

  const OverallIcon = overallPresentation.icon;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/staff/(admin)/(tabs)");
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[15px] font-extrabold text-ink-dark">
              Checking system status...
            </Text>

            <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-muted">
              Checking Smart Queue services and database connectivity
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 140,
          }}
        >
          <Header onBack={handleBack} />

          <View className="mt-5 rounded-[28px] border border-white/90 bg-clay-surface p-5 shadow-clay">
            <View className="items-center">
              <View
                className="h-[78px] w-[78px] items-center justify-center rounded-[26px]"
                style={{
                  backgroundColor: overallPresentation.background,
                }}
              >
                <OverallIcon
                  size={39}
                  color={overallPresentation.color}
                  strokeWidth={2.2}
                />
              </View>

              <Text className="mt-4 text-[21px] font-extrabold text-ink-dark">
                System Status
              </Text>

              <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-secondary">
                Current health of Smart Queue services
              </Text>

              <View
                className="mt-4 flex-row items-center rounded-full px-4 py-2"
                style={{
                  backgroundColor: overallPresentation.background,
                }}
              >
                <OverallIcon
                  size={14}
                  color={overallPresentation.color}
                  strokeWidth={2.4}
                />

                <Text
                  className="ml-2 text-[10px] font-extrabold uppercase"
                  style={{
                    color: overallPresentation.color,
                  }}
                >
                  System {overallPresentation.label}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-center rounded-[18px] bg-slate-50 px-4 py-3">
              <Clock3 size={15} color="#64748B" strokeWidth={2.3} />

              <Text className="ml-2 text-[10px] font-bold text-slate-600">
                Last checked: {formatCheckedAt(systemStatus.checkedAt)}
              </Text>
            </View>
          </View>

          <SectionTitle
            icon={
              <Server size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="Services"
          />

          <View className="overflow-hidden rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
            {systemStatus.services.map((service, index) => (
              <View key={service.id}>
                <ServiceRow service={service} />

                {index < systemStatus.services.length - 1 && (
                  <View className="mx-5 h-px bg-slate-100" />
                )}
              </View>
            ))}
          </View>

          <SectionTitle
            icon={
              <Activity
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="System Overview"
          />

          <View className="flex-row flex-wrap justify-between">
            <OverviewCard
              icon={
                <Wifi size={19} color={colors.primaryDark} strokeWidth={2.3} />
              }
              label="Services"
              value={`${systemStatus.services.length}`}
              description="Monitored"
            />

            <OverviewCard
              icon={
                <CheckCircle2 size={19} color="#059669" strokeWidth={2.3} />
              }
              label="Operational"
              value={`${
                systemStatus.services.filter(
                  (service) => service.status === "operational",
                ).length
              }`}
              description="Healthy"
            />

            <OverviewCard
              icon={
                <AlertTriangle size={19} color="#D97706" strokeWidth={2.3} />
              }
              label="Degraded"
              value={`${
                systemStatus.services.filter(
                  (service) => service.status === "degraded",
                ).length
              }`}
              description="Slow"
            />

            <OverviewCard
              icon={<XCircle size={19} color="#DC2626" strokeWidth={2.3} />}
              label="Offline"
              value={`${
                systemStatus.services.filter(
                  (service) => service.status === "offline",
                ).length
              }`}
              description="Unavailable"
            />
          </View>

          <View className="mt-6 rounded-[23px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
            <View className="flex-row items-center">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                <Clock3
                  size={19}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[13px] font-extrabold text-ink-dark">
                  Response Time
                </Text>

                <Text className="mt-0.5 text-[10px] leading-[15px] text-ink-secondary">
                  Service checks above 3 seconds are considered degraded.
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={refresh}
            disabled={refreshing}
            className="mt-5 h-[52px] flex-row items-center justify-center rounded-full bg-ocean-400"
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />

                <Text className="ml-2 text-[12px] font-extrabold text-white">
                  Check Again
                </Text>
              </>
            )}
          </Pressable>

          {error && (
            <View className="mt-5 rounded-[22px] border border-red-100 bg-white/90 p-4">
              <View className="flex-row items-center">
                <AlertTriangle size={18} color="#DC2626" strokeWidth={2.3} />

                <Text className="ml-2 flex-1 text-[10px] font-semibold leading-[16px] text-red-700">
                  {error}
                </Text>
              </View>
            </View>
          )}

          <Text className="mt-5 text-center text-[10px] font-medium text-ink-muted">
            Smart Queue System Monitoring
          </Text>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ================================================================
   HEADER
================================================================ */

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={onBack}
        className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm"
      >
        <ArrowLeft size={20} color="#334155" strokeWidth={2.4} />
      </Pressable>

      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
          ADMIN
        </Text>

        <Text className="mt-0.5 text-[19px] font-extrabold text-ink-dark">
          System Status
        </Text>
      </View>
    </View>
  );
}

/* ================================================================
   SECTION TITLE
================================================================ */

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="mb-2 mt-6 flex-row items-center">
      <View className="h-[31px] w-[31px] items-center justify-center rounded-[11px] bg-ocean-100">
        {icon}
      </View>

      <Text className="ml-2 text-[14px] font-extrabold text-ink-dark">
        {title}
      </Text>
    </View>
  );
}

/* ================================================================
   SERVICE ROW
================================================================ */

function ServiceRow({ service }: { service: SystemService }) {
  const presentation = getStatusPresentation(service.status);
  const StatusIcon = presentation.icon;
  const ServiceIcon = getServiceIcon(service.id);

  return (
    <View className="px-5 py-4">
      <View className="flex-row items-center">
        <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
          <ServiceIcon size={20} color={colors.primaryDark} strokeWidth={2.2} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[13px] font-extrabold text-ink-dark">
            {service.name}
          </Text>

          <Text className="mt-0.5 text-[10px] leading-[15px] text-ink-secondary">
            {service.description}
          </Text>
        </View>

        <View
          className="ml-2 flex-row items-center rounded-full px-3 py-1.5"
          style={{
            backgroundColor: presentation.background,
          }}
        >
          <StatusIcon size={12} color={presentation.color} strokeWidth={2.5} />

          <Text
            className="ml-1.5 text-[9px] font-extrabold uppercase"
            style={{
              color: presentation.color,
            }}
          >
            {presentation.label}
          </Text>
        </View>
      </View>

      <View className="ml-[57px] mt-3 rounded-[14px] bg-slate-50 px-3 py-2.5">
        <Text className="text-[10px] font-semibold leading-[15px] text-slate-600">
          {service.details}
        </Text>

        {service.responseTime !== null && (
          <View className="mt-1.5 flex-row items-center">
            <Clock3 size={11} color="#94A3B8" strokeWidth={2.2} />

            <Text className="ml-1 text-[9px] font-bold text-slate-400">
              Response time: {service.responseTime} ms
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ================================================================
   OVERVIEW CARD
================================================================ */

function OverviewCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <View className="mb-3 w-[48%] rounded-[22px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
      <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-1 text-[24px] font-extrabold text-ink-dark">
        {value}
      </Text>

      <Text className="mt-0.5 text-[9px] font-semibold text-ink-secondary">
        {description}
      </Text>
    </View>
  );
}
