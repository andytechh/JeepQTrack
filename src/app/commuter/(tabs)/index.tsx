import { useRouter } from "expo-router";
import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  X,
  ZoomIn,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import { useCommuterDashboard } from "../../../src/shared/hooks/useCommuterDashboard";
import { useOperatingSchedule } from "../../../src/shared/hooks/useOperatingSchedule";

/* ============================================================
   TYPES
============================================================ */

type JeepneyImageProps = {
  imageUrl?: string | null;
  jeepName?: string | null;
  plateNumber?: string | null;
  size?: "small" | "large";
  onPress?: () => void;
};

type ServiceEndedNoticeProps = {
  compact?: boolean;
};

/* ============================================================
   HELPERS
============================================================ */

function getTerminalName(
  terminalId: number | null,
  terminalNames: Record<number, string>,
) {
  if (!terminalId) return "Terminal";

  return terminalNames[terminalId] ?? `Terminal ${terminalId}`;
}

function getOccupancyPercentage(occupancy: number, capacity: number): number {
  if (!capacity || capacity <= 0) return 0;

  return Math.min(100, Math.round((occupancy / capacity) * 100));
}

function getOccupancyLabel(occupancy: number, capacity: number): string {
  const percentage = getOccupancyPercentage(occupancy, capacity);

  if (percentage >= 100) return "Full";
  if (percentage >= 80) return "Almost full";
  if (percentage >= 50) return "Moderate";

  return "Seats available";
}

function getActivityText(status: string) {
  const normalized = status?.toLowerCase();

  switch (normalized) {
    case "waiting":
      return "joined the queue";

    case "dispatched":
      return "was dispatched";

    case "loading":
      return "is loading";

    case "arrived":
      return "arrived at the terminal";

    case "en_route":
      return "is en route";

    case "inactive":
      return "became inactive";

    default:
      return "queue status updated";
  }
}

function formatActivityTime(timestamp: string) {
  try {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ============================================================
   SERVICE ENDED NOTICE
============================================================ */

function ServiceEndedNotice({ compact = false }: ServiceEndedNoticeProps) {
  return (
    <View
      className={
        compact
          ? "mt-3 flex-row items-center rounded-[16px] bg-slate-100 px-3 py-2.5"
          : "mt-4 rounded-[18px] bg-slate-100 px-4 py-3"
      }
      style={{
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.95)",
      }}
    >
      <View className="ml-2.5 flex-1">
        <Text
          className={
            compact
              ? "text-[9px] font-extrabold uppercase tracking-[0.5px] text-slate-600"
              : "text-[10px] font-extrabold uppercase tracking-[0.6px] text-slate-600"
          }
        >
          Service ended
        </Text>

        <Text
          className={
            compact
              ? "mt-0.5 text-[9px] leading-[14px] text-slate-500"
              : "mt-0.5 text-[10px] leading-[15px] text-slate-500"
          }
        >
          Live jeepney movement is unavailable until the next service period.
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   JEEPNEY IMAGE
============================================================ */

function JeepneyImage({
  imageUrl,
  jeepName,
  plateNumber,
  size = "large",
  onPress,
}: JeepneyImageProps) {
  const isSmall = size === "small";

  const width = isSmall ? 72 : 110;
  const height = isSmall ? 72 : 110;

  return (
    <Pressable
      disabled={!imageUrl}
      onPress={onPress}
      className="overflow-hidden rounded-[22px]"
      style={{
        width,
        height,
        backgroundColor: "#E0F2FE",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.95)",
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.07,
        shadowRadius: 7,
        elevation: 3,
      }}
    >
      {imageUrl ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode="cover"
          />

          <View
            pointerEvents="none"
            className="absolute bottom-2 right-2 h-[26px] w-[26px] items-center justify-center rounded-full bg-black/45"
          >
            <ZoomIn size={13} color="#FFFFFF" strokeWidth={2.3} />
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-white">
            <BusFront size={25} color={colors.primaryDark} strokeWidth={2.1} />
          </View>

          <Text
            numberOfLines={1}
            className="mt-2 max-w-[85px] text-center text-[8px] font-bold text-ocean-700"
          >
            {jeepName || plateNumber || "Jeepney"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/* ============================================================
   IMAGE MODAL
============================================================ */

function JeepneyImageModal({
  visible,
  imageUrl,
  jeepName,
  plateNumber,
  onClose,
}: {
  visible: boolean;
  imageUrl: string | null;
  jeepName?: string | null;
  plateNumber?: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/75 px-5">
        <Pressable onPress={onClose} className="absolute inset-0" />

        <View
          className="w-full max-w-[420px] overflow-hidden rounded-[28px] bg-clay-surface"
          style={{
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.95)",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 8,
            },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1 pr-3">
              <Text className="text-[10px] font-extrabold uppercase tracking-[0.8px] text-ocean-700">
                Jeepney
              </Text>

              <Text className="mt-1 text-[18px] font-extrabold text-ink-dark">
                {jeepName || plateNumber || "Jeepney"}
              </Text>

              {jeepName && plateNumber ? (
                <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
                  {plateNumber}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={onClose}
              className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ocean-50"
            >
              <X size={18} color={colors.primaryDark} strokeWidth={2.3} />
            </Pressable>
          </View>

          <View className="px-4 pb-4">
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: "100%",
                  height: 330,
                  borderRadius: 22,
                }}
                resizeMode="contain"
              />
            ) : (
              <View className="h-[330px] items-center justify-center rounded-[22px] bg-ocean-50">
                <BusFront
                  size={70}
                  color={colors.primaryDark}
                  strokeWidth={1.7}
                />

                <Text className="mt-4 text-[12px] font-bold text-ink-secondary">
                  No jeepney image available
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   NEXT JEEPNEY CARD
============================================================ */

function NextJeepneyCard({
  jeepney,
  terminalName,
  serviceOpen,
  onImagePress,
}: {
  jeepney: any;
  terminalName: string;
  serviceOpen: boolean;
  onImagePress: () => void;
}) {
  const occupancy = getOccupancyPercentage(
    jeepney.current_occupancy ?? 0,
    jeepney.capacity ?? 0,
  );

  const isLoading = jeepney.status?.toLowerCase() === "loading";

  const isDispatched = jeepney.status?.toLowerCase() === "dispatched";

  const isEnRoute = jeepney.status?.toLowerCase() === "en_route";

  const displayedStatus = serviceOpen
    ? (jeepney.status ?? "Waiting")
    : "Inactive";

  return (
    <View className="mt-4 overflow-hidden rounded-[28px] border border-white/90 bg-clay-surface p-5 shadow-clay-floating">
      {/* TOP */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-ink-muted">
            Next Jeepney
          </Text>

          <Text className="mt-2 text-[27px] font-extrabold text-ink-dark">
            {jeepney.plate_number}
          </Text>

          {jeepney.jeep_name ? (
            <Text className="mt-0.5 text-[11px] font-bold text-ocean-700">
              {jeepney.jeep_name}
            </Text>
          ) : null}

          <View className="mt-2 flex-row items-center">
            <MapPin size={13} color={colors.primaryDark} strokeWidth={2.3} />

            <Text className="ml-1.5 text-[11px] font-semibold text-ink-secondary">
              {terminalName}
            </Text>
          </View>
        </View>

        <JeepneyImage
          imageUrl={jeepney.image_url}
          jeepName={jeepney.jeep_name}
          plateNumber={jeepney.plate_number}
          onPress={onImagePress}
        />
      </View>

      {!serviceOpen ? (
        <ServiceEndedNotice />
      ) : (
        <>
          {/* QUEUE POSITION */}
          <View className="mt-5 flex-row items-center rounded-[18px] bg-ocean-50 px-4 py-3">
            <View className="h-[35px] w-[35px] items-center justify-center rounded-full bg-white">
              <Text className="text-[13px] font-extrabold text-ocean-700">
                #
              </Text>
            </View>

            <View className="ml-3">
              <Text className="text-[9px] font-bold uppercase tracking-[0.7px] text-ink-muted">
                Queue position
              </Text>

              <Text className="mt-0.5 text-[15px] font-extrabold text-ink-dark">
                #{jeepney.queue_position ?? "—"}
              </Text>
            </View>
          </View>

          {/* OCCUPANCY */}
          <View className="mt-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Users
                  size={15}
                  color={colors.textSecondary}
                  strokeWidth={2.2}
                />

                <Text className="ml-2 text-[11px] font-bold text-ink-secondary">
                  Occupancy
                </Text>
              </View>

              <Text className="text-[11px] font-extrabold text-ink-dark">
                {jeepney.current_occupancy ?? 0}/{jeepney.capacity ?? 0}
              </Text>
            </View>

            <View className="mt-2 h-[9px] overflow-hidden rounded-full bg-ocean-100">
              <View
                className={`h-full rounded-full ${
                  occupancy >= 90
                    ? "bg-red-400"
                    : occupancy >= 70
                      ? "bg-amber-400"
                      : "bg-ocean-400"
                }`}
                style={{
                  width: `${occupancy}%`,
                }}
              />
            </View>

            <View className="mt-2 flex-row justify-between">
              <Text className="text-[10px] text-ink-muted">
                {getOccupancyLabel(
                  jeepney.current_occupancy ?? 0,
                  jeepney.capacity ?? 0,
                )}
              </Text>

              <Text className="text-[10px] font-semibold text-ink-secondary">
                {occupancy}%
              </Text>
            </View>
          </View>
        </>
      )}

      {/* STATUS */}
      <View className="mt-5 flex-row items-center">
        <View
          className={`h-[40px] w-[40px] items-center justify-center rounded-[14px] ${
            !serviceOpen
              ? "bg-slate-100"
              : isLoading
                ? "bg-amber-100"
                : isDispatched
                  ? "bg-green-100"
                  : isEnRoute
                    ? "bg-blue-100"
                    : "bg-sky-100"
          }`}
        >
          {!serviceOpen ? (
            <Clock3 size={18} color="#64748B" strokeWidth={2.3} />
          ) : isLoading ? (
            <Clock3 size={18} color="#D97706" strokeWidth={2.3} />
          ) : isDispatched ? (
            <CheckCircle2 size={18} color="#16A34A" strokeWidth={2.3} />
          ) : (
            <BusFront size={18} color={colors.primaryDark} strokeWidth={2.3} />
          )}
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Current status
          </Text>

          <Text className="mt-0.5 text-[14px] font-extrabold capitalize text-ink-dark">
            {displayedStatus}
          </Text>

          {!serviceOpen ? (
            <Text className="mt-0.5 text-[9px] font-medium text-slate-500">
              Service ended — jeepney is inactive
            </Text>
          ) : null}
        </View>
      </View>

      {/* DRIVER */}
      {jeepney.driver_name ? (
        <View className="mt-4 border-t border-slate-200/70 pt-4">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Driver
          </Text>

          <Text className="mt-1 text-[11px] font-semibold text-ink-secondary">
            {jeepney.driver_name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ============================================================
   QUEUE SUMMARY
============================================================ */

function QueueSummaryCard({
  queueCount,
  terminalOneCount,
  terminalTwoCount,
  serviceOpen,
}: {
  queueCount: number;
  terminalOneCount: number;
  terminalTwoCount: number;
  serviceOpen: boolean;
}) {
  return (
    <View className="mt-6 overflow-hidden rounded-[28px] border border-white/90 bg-ocean-400 p-5 shadow-clay-floating">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-white/70">
            Live Terminal
          </Text>

          <Text className="mt-2 text-[40px] font-extrabold leading-[44px] text-white">
            {queueCount}
          </Text>

          <Text className="text-[12px] font-semibold text-white/80">
            jeepneys in queue
          </Text>
        </View>

        <View className="h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-white/20">
          <BusFront size={26} color="#FFFFFF" strokeWidth={2.1} />
        </View>
      </View>

      <View className="mt-5 h-[1px] bg-white/20" />

      <View className="mt-4 flex-row">
        <View className="flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-white/60">
            Donsol
          </Text>

          <Text className="mt-1 text-[18px] font-extrabold text-white">
            {terminalOneCount}
          </Text>

          <Text className="text-[9px] font-medium text-white/70">in queue</Text>
        </View>

        <View className="w-[1px] bg-white/20" />

        <View className="ml-5 flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-white/60">
            Daraga
          </Text>

          <Text className="mt-1 text-[18px] font-extrabold text-white">
            {terminalTwoCount}
          </Text>

          <Text className="text-[9px] font-medium text-white/70">in queue</Text>
        </View>
      </View>

      {!serviceOpen ? (
        <View className="mt-5 rounded-[16px] bg-black/10 px-3 py-2.5">
          <Text className="text-[9px] font-extrabold uppercase tracking-[0.6px] text-white/90">
            Service ended
          </Text>

          <Text className="mt-0.5 text-[9px] leading-[14px] text-white/80">
            Queue information is retained for reference. Live dispatch service
            is currently inactive.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* ============================================================
   ACTIVITY CARD
============================================================ */

function ActivityCard({
  activities,
  terminalNames,
  serviceOpen,
}: {
  activities: any[];
  terminalNames: Record<number, string>;
  serviceOpen: boolean;
}) {
  return (
    <View className="mt-4 overflow-hidden rounded-[26px] border border-white/90 bg-clay-surface shadow-clay-sm">
      {activities.length === 0 ? (
        <View className="items-center px-5 py-8">
          <RefreshCw size={23} color={colors.textMuted} />

          <Text className="mt-3 text-[12px] font-semibold text-ink-secondary">
            No recent queue activity
          </Text>

          {!serviceOpen ? (
            <Text className="mt-1 text-center text-[9px] text-slate-500">
              Service ended. Historical activity remains available.
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          {activities.slice(0, 5).map((activity, index) => {
            const terminalName = getTerminalName(
              activity.terminalId,
              terminalNames,
            );

            const isLast = index === Math.min(activities.length, 5) - 1;

            return (
              <View
                key={activity.id}
                className={`flex-row items-center px-5 py-4 ${
                  !isLast ? "border-b border-slate-200/70" : ""
                }`}
              >
                <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
                  <BusFront
                    size={17}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text
                    numberOfLines={2}
                    className="text-[11px] font-bold leading-[16px] text-ink-dark"
                  >
                    <Text className="font-extrabold">
                      {activity.plateNumber}
                    </Text>{" "}
                    {getActivityText(activity.status)}
                  </Text>

                  <Text className="mt-1 text-[9px] font-medium text-ink-muted">
                    {terminalName}
                    {activity.queuePosition
                      ? ` • Queue #${activity.queuePosition}`
                      : ""}
                  </Text>
                </View>

                <Text className="ml-2 text-[9px] font-semibold text-ink-muted">
                  {formatActivityTime(activity.timestamp)}
                </Text>
              </View>
            );
          })}

          {!serviceOpen ? (
            <View className="border-t border-slate-200/70 px-5 py-3">
              <View className="flex-row items-center">
                <Clock3 size={13} color="#64748B" strokeWidth={2.2} />

                <Text className="ml-2 text-[9px] font-bold text-slate-500">
                  Service ended — no new live activity expected
                </Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/* ============================================================
   MAIN DASHBOARD
============================================================ */

export default function CommuterDashboardScreen() {
  const router = useRouter();

  const { isOpen } = useOperatingSchedule();

  /*
   * IMPORTANT:
   * We still pass isOpen into the dashboard hook so it can
   * distinguish normal live operation from service-ended state.
   *
   * The dashboard itself is NEVER hidden when isOpen === false.
   */
  const {
    profile,
    jeepneys,
    nextJeepney,
    queueCount,
    activities,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    terminalNames,
  } = useCommuterDashboard(isOpen);

  const [imageViewer, setImageViewer] = useState<{
    visible: boolean;
    imageUrl: string | null;
    jeepName: string | null;
    plateNumber: string | null;
  }>({
    visible: false,
    imageUrl: null,
    jeepName: null,
    plateNumber: null,
  });

  const openImageViewer = (jeepney: any) => {
    setImageViewer({
      visible: true,
      imageUrl: jeepney.image_url ?? null,
      jeepName: jeepney.jeep_name ?? null,
      plateNumber: jeepney.plate_number ?? null,
    });
  };

  const closeImageViewer = () => {
    setImageViewer({
      visible: false,
      imageUrl: null,
      jeepName: null,
      plateNumber: null,
    });
  };

  /* ==========================================================
     TERMINAL COUNTS
  ========================================================== */

  const terminalCounts = useMemo(() => {
    return {
      donsol: jeepneys.filter((jeepney) => jeepney.terminal_id === 1).length,

      daraga: jeepneys.filter((jeepney) => jeepney.terminal_id === 2).length,
    };
  }, [jeepneys]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = async () => {
    await refresh();
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading && jeepneys.length === 0) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <View className="items-center">
            <View className="h-[64px] w-[64px] items-center justify-center rounded-[21px] bg-clay-surface shadow-clay-sm">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>

            <Text className="mt-4 text-[13px] font-bold text-ink-secondary">
              Loading Smart Queue...
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error && jeepneys.length === 0) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-6">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
              SMART QUEUE
            </Text>

            <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
              Dashboard
            </Text>

            {!isOpen ? <ServiceEndedNotice /> : null}

            <View className="mt-6 rounded-[26px] border border-red-100 bg-red-50 p-5">
              <View className="flex-row items-start">
                <CircleAlert size={21} color="#DC2626" strokeWidth={2.2} />

                <View className="ml-3 flex-1">
                  <Text className="text-[13px] font-extrabold text-red-700">
                    Unable to load queue
                  </Text>

                  <Text className="mt-1 text-[11px] leading-[17px] text-red-600">
                    {error}
                  </Text>

                  <Pressable
                    onPress={handleRefresh}
                    className="mt-4 self-start rounded-full bg-red-600 px-4 py-2.5"
                  >
                    <Text className="text-[10px] font-extrabold text-white">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ==========================================================
     DASHBOARD
  ========================================================== */

  return (
    <OceanBackground intensity={0.2}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            paddingBottom: 130,
          }}
        >
          <View className="px-5 pt-4">
            {/* =================================================
                HEADER
            ================================================= */}

            <View className="flex-row items-start">
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
                  SMART QUEUE
                </Text>

                <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
                  Dashboard
                </Text>

                <View className="mt-2 flex-row items-center">
                  <MapPin
                    size={14}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />

                  <Text className="ml-1.5 text-[12px] font-medium text-ink-secondary">
                    Donsol → Daraga
                  </Text>
                </View>
              </View>
            </View>

            {/* =================================================
                SERVICE STATUS
            ================================================= */}

            {!isOpen ? (
              <View className="mt-4">
                <ServiceEndedNotice />
              </View>
            ) : null}

            {/* =================================================
                GREETING
            ================================================= */}

            {profile?.display_name ? (
              <Text className="mt-4 text-[12px] font-medium text-ink-secondary">
                Hello,{" "}
                <Text className="font-extrabold text-ink-dark">
                  {profile.display_name}
                </Text>
              </Text>
            ) : null}

            {/* =================================================
                LIVE TERMINAL
            ================================================= */}

            <QueueSummaryCard
              queueCount={queueCount}
              terminalOneCount={terminalCounts.donsol}
              terminalTwoCount={terminalCounts.daraga}
              serviceOpen={isOpen}
            />

            {/* =================================================
                NEXT JEEPNEY
            ================================================= */}

            {nextJeepney ? (
              <NextJeepneyCard
                jeepney={nextJeepney}
                terminalName={getTerminalName(
                  nextJeepney.terminal_id,
                  terminalNames,
                )}
                serviceOpen={isOpen}
                onImagePress={() => openImageViewer(nextJeepney)}
              />
            ) : (
              <View className="mt-4 overflow-hidden rounded-[28px] border border-white/90 bg-clay-surface p-6 shadow-clay-floating">
                <View className="items-center">
                  <View className="h-[58px] w-[58px] items-center justify-center rounded-[19px] bg-ocean-100">
                    <BusFront
                      size={27}
                      color={colors.primaryDark}
                      strokeWidth={2}
                    />
                  </View>

                  <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
                    {isOpen ? "Queue is currently empty" : "No active jeepney"}
                  </Text>

                  <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-secondary">
                    {isOpen
                      ? "There are no jeepneys currently registered in the Smart Queue."
                      : "Service has ended. Jeepney operations are currently inactive."}
                  </Text>

                  {!isOpen ? <ServiceEndedNotice compact /> : null}
                </View>
              </View>
            )}

            {/* =================================================
                VIEW FULL QUEUE
            ================================================= */}

            <Pressable
              onPress={() => router.push("/commuter/(tabs)/queue")}
              className="mt-4 flex-row items-center justify-between rounded-[22px] border border-white/90 bg-clay-surface px-5 py-4 shadow-clay-sm"
            >
              <View className="flex-row items-center">
                <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-ocean-100">
                  <BusFront
                    size={18}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                </View>

                <View className="ml-3">
                  <Text className="text-[12px] font-extrabold text-ink-dark">
                    View Full Queue
                  </Text>

                  <Text className="mt-0.5 text-[10px] text-ink-secondary">
                    See all {queueCount} jeepneys
                  </Text>
                </View>
              </View>

              <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-ocean-50">
                <ArrowRight
                  size={17}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>
            </Pressable>

            {!isOpen ? (
              <View className="mt-3">
                <ServiceEndedNotice compact />
              </View>
            ) : null}

            {/* =================================================
                RECENT ACTIVITY
            ================================================= */}

            <View className="mt-7">
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-[18px] font-extrabold text-ink-dark">
                    Recent Activity
                  </Text>

                  <Text className="mt-1 text-[10px] text-ink-secondary">
                    Latest changes in the jeepney queue
                  </Text>
                </View>

                <View className="rounded-full bg-ocean-100 px-3 py-1.5">
                  <Text className="text-[9px] font-extrabold text-ocean-700">
                    {isOpen ? "LIVE" : "ENDED"}
                  </Text>
                </View>
              </View>

              <ActivityCard
                activities={activities}
                terminalNames={terminalNames}
                serviceOpen={isOpen}
              />
            </View>

            {/* =================================================
                LIVE UPDATE FOOTER
            ================================================= */}

            <View className="mt-7 items-center pb-3">
              <View className="flex-row items-center">
                <View
                  className={`h-[8px] w-[8px] rounded-full ${
                    isOpen ? "bg-green-500" : "bg-slate-400"
                  }`}
                />

                <Text className="ml-2 text-[9px] font-semibold text-ink-muted">
                  {isOpen
                    ? "Live queue updates enabled"
                    : "Service ended — live updates inactive"}
                </Text>
              </View>

              {lastUpdated ? (
                <Text className="mt-1 text-[8px] text-ink-muted">
                  Last updated{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ========================================================
          JEEPNEY IMAGE VIEWER
      ======================================================== */}

      <JeepneyImageModal
        visible={imageViewer.visible}
        imageUrl={imageViewer.imageUrl}
        jeepName={imageViewer.jeepName}
        plateNumber={imageViewer.plateNumber}
        onClose={closeImageViewer}
      />
    </OceanBackground>
  );
}
