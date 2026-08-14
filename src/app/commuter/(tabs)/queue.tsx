// app/commuter/(tabs)/queue.tsx
import {
  ArrowRight,
  BusFront,
  Clock3,
  Info,
  MapPin,
  RefreshCw,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import { useCommuterQueue } from "../../../src/shared/hooks/useCommuterQueue";

type JeepneyStatus =
  "LOADING" | "WAITING" | "ARRIVED" | "EN_ROUTE" | "DEPARTED";

interface Jeepney {
  id: string;
  number: string;
  status: JeepneyStatus;
  passengers: number;
  capacity: number;
  estimatedDeparture: string;
  terminalId: number;
  jeepName: string;
  driverName: string;
}

const TERMINAL_NAMES: Record<number, string> = { 1: "Donsol", 2: "Daraga" };

const STATUS_CONFIG: Record<
  JeepneyStatus,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    container: string;
    text: string;
  }
> = {
  ARRIVED: {
    label: "Arrived",
    description: "Jeepney is at the terminal.",
    icon: <MapPin size={16} color="#0284C7" strokeWidth={2.5} />,
    container: "bg-sky-100",
    text: "text-sky-700",
  },
  LOADING: {
    label: "Loading",
    description: "Passengers are boarding.",
    icon: <Users size={16} color="#D97706" strokeWidth={2.5} />,
    container: "bg-amber-100",
    text: "text-amber-700",
  },
  WAITING: {
    label: "Waiting",
    description: "In queue, ready to load.",
    icon: <Clock3 size={16} color="#16A34A" strokeWidth={2.5} />,
    container: "bg-green-100",
    text: "text-green-700",
  },
  EN_ROUTE: {
    label: "En Route",
    description: "On the way to destination.",
    icon: <ArrowRight size={16} color="#2563EB" strokeWidth={2.5} />,
    container: "bg-blue-100",
    text: "text-blue-700",
  },
  DEPARTED: {
    label: "Departed",
    description: "Already left the terminal.",
    icon: <ArrowRight size={16} color="#64748B" strokeWidth={2.5} />,
    container: "bg-slate-100",
    text: "text-slate-600",
  },
};

function getOccupancyPercentage(passengers: number, capacity: number) {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((passengers / capacity) * 100));
}

function getOccupancyLabel(passengers: number, capacity: number) {
  const percentage = getOccupancyPercentage(passengers, capacity);
  if (percentage >= 100) return "Full";
  if (percentage >= 80) return "Almost full";
  if (percentage >= 50) return "Moderate";
  return "Seats available";
}

function JeepneyCard({
  jeepney,
  onPressDetails,
}: {
  jeepney: Jeepney;
  onPressDetails: () => void;
}) {
  const status = STATUS_CONFIG[jeepney.status];
  const occupancy = getOccupancyPercentage(
    jeepney.passengers,
    jeepney.capacity,
  );
  const seatsLeft = Math.max(0, jeepney.capacity - jeepney.passengers);
  const isDeparted = jeepney.status === "DEPARTED";

  return (
    <View
      className={`mb-4 rounded-[26px] border border-white/90 bg-clay-surface p-5 shadow-clay-sm ${
        isDeparted ? "opacity-65" : ""
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center">
          <View
            className={`h-[52px] w-[52px] items-center justify-center rounded-[18px] ${
              isDeparted ? "bg-slate-100" : "bg-ocean-100"
            }`}
          >
            <BusFront
              size={25}
              color={isDeparted ? "#64748B" : colors.primaryDark}
              strokeWidth={2.1}
            />
          </View>

          <View className="ml-3">
            <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-ink-muted">
              Jeepney
            </Text>
            <Text className="mt-0.5 text-[22px] font-extrabold text-ink-dark">
              #{jeepney.number}
            </Text>
            <View className="mt-1 flex-row items-center">
              <MapPin size={12} color="#64748b" strokeWidth={2} />
              <Text className="ml-1 text-[10px] text-ink-muted">
                {TERMINAL_NAMES[jeepney.terminalId] || "Terminal"}
              </Text>
            </View>
          </View>
        </View>

        <View
          className={`flex-row items-center rounded-full px-3 py-2 ${status.container}`}
        >
          {status.icon}
          <Text className={`ml-1.5 text-[10px] font-extrabold ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-[11px] text-ink-secondary">
        {status.description}
      </Text>

      <View className="mt-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Users size={15} color={colors.textSecondary} strokeWidth={2.2} />
            <Text className="ml-2 text-[11px] font-bold text-ink-secondary">
              Occupancy
            </Text>
          </View>
          <Text className="text-[11px] font-extrabold text-ink-dark">
            {jeepney.passengers}/{jeepney.capacity}
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
            style={{ width: `${occupancy}%` }}
          />
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-[10px] text-ink-muted">
            {getOccupancyLabel(jeepney.passengers, jeepney.capacity)}
          </Text>
          <Text className="text-[10px] font-semibold text-ink-secondary">
            {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row items-center rounded-[18px] bg-ocean-50 px-4 py-3">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white">
          {jeepney.status === "EN_ROUTE" ? (
            <MapPin size={16} color={colors.primaryDark} strokeWidth={2.3} />
          ) : (
            <Clock3 size={16} color={colors.primaryDark} strokeWidth={2.3} />
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            {jeepney.status === "EN_ROUTE"
              ? "Estimated arrival"
              : "Estimated departure"}
          </Text>
          <Text className="mt-0.5 text-[14px] font-extrabold text-ink-dark">
            {jeepney.estimatedDeparture}
          </Text>
          <Text className="text-[8px] text-ink-muted italic">
            * Estimated, may change
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onPressDetails}
        className="mt-4 flex-row items-center justify-end"
      >
        <Text className="text-[10px] text-ocean-500 font-semibold">
          View details
        </Text>
        <Info size={14} color="#0ea5e9" strokeWidth={2} className="ml-1" />
      </TouchableOpacity>
    </View>
  );
}

const STATUS_ORDER: JeepneyStatus[] = [
  "LOADING",
  "WAITING",
  "ARRIVED",
  "EN_ROUTE",
  "DEPARTED",
];

export default function CommuterQueueScreen() {
  const { jeepneys, loading, refreshing, refresh, error } = useCommuterQueue();
  const [selectedJeepney, setSelectedJeepney] = useState<Jeepney | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const onRefresh = useCallback(() => refresh(), [refresh]);

  const openDetails = (jeepney: Jeepney) => {
    setSelectedJeepney(jeepney);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedJeepney(null);
  };

  // Group by status
  const grouped = useMemo(() => {
    const map: Record<JeepneyStatus, Jeepney[]> = {
      LOADING: [],
      WAITING: [],
      ARRIVED: [],
      EN_ROUTE: [],
      DEPARTED: [],
    };
    jeepneys.forEach((j) => {
      if (map[j.status]) map[j.status].push(j);
    });
    return map;
  }, [jeepneys]);

  const statusKeys = STATUS_ORDER.filter((key) => grouped[key].length > 0);

  // Queue summary: count LOADING + WAITING, per terminal
  const loadingAndWaiting = jeepneys.filter(
    (j) => j.status === "LOADING" || j.status === "WAITING",
  );
  const terminalCounts = {
    1: loadingAndWaiting.filter((j) => j.terminalId === 1).length,
    2: loadingAndWaiting.filter((j) => j.terminalId === 2).length,
  };

  if (error) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
          <TouchableOpacity
            onPress={refresh}
            className="mt-4 rounded-xl bg-ocean-400 px-6 py-3"
          >
            <Text className="font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (loading && jeepneys.length === 0) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-sm text-ink-secondary">
            Loading queue...
          </Text>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (jeepneys.length === 0 && !loading) {
    return (
      <OceanBackground intensity={0.2}>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <BusFront size={48} color="#94a3b8" />
          <Text className="mt-3 text-lg font-bold text-ink-dark">
            No jeepneys in queue
          </Text>
          <Text className="mt-1 text-sm text-ink-secondary text-center">
            There are currently no jeepneys available.
          </Text>
          <TouchableOpacity
            onPress={refresh}
            className="mt-6 rounded-xl bg-ocean-400 px-6 py-3"
          >
            <Text className="font-semibold text-white">Refresh</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.2}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="px-5 pt-4">
            {/* HEADER */}
            <View>
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
                SMART QUEUE
              </Text>
              <Text className="mt-1 text-[28px] font-extrabold text-ink-dark">
                Jeepney Queue
              </Text>
              <View className="mt-2 flex-row items-center">
                <MapPin
                  size={14}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
                <Text className="ml-1 text-[12px] font-medium text-ink-secondary">
                  All Terminals
                </Text>
              </View>
            </View>

            {/* ─── QUEUE SUMMARY (improved) ───────────────────────── */}
            <View className="mt-6 rounded-[28px] border border-white/90 bg-ocean-400 p-5 shadow-clay-floating">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">
                    Waiting to Load
                  </Text>
                  <Text className="mt-2 text-[44px] font-extrabold leading-[48px] text-white">
                    {loadingAndWaiting.length}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-3">
                    <View className="flex-row items-center">
                      <View className="h-2 w-2 rounded-full bg-white/60 mr-1" />
                      <Text className="text-[11px] font-medium text-white/80">
                        Donsol: {terminalCounts[1]}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View className="h-2 w-2 rounded-full bg-white/60 mr-1" />
                      <Text className="text-[11px] font-medium text-white/80">
                        Daraga: {terminalCounts[2]}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-white/20">
                  <BusFront size={25} color="#FFFFFF" strokeWidth={2.1} />
                </View>
              </View>

              <View className="mt-5 h-[1px] bg-white/20" />

              <View className="mt-4 flex-row items-center">
                <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white/20">
                  <Clock3 size={16} color="#FFFFFF" strokeWidth={2.3} />
                </View>
                <View className="ml-3">
                  <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-white/60">
                    Next departure
                  </Text>
                  <Text className="mt-0.5 text-[14px] font-extrabold text-white">
                    {loadingAndWaiting[0]?.estimatedDeparture ||
                      "No jeepney available"}
                  </Text>
                </View>
              </View>
            </View>

            {/* LIVE STATUS */}
            <View className="mt-5 flex-row items-center rounded-[21px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
              <View className="h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-green-100">
                <View className="h-[10px] w-[10px] rounded-full bg-green-500" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-bold text-ink-dark">
                  Live queue status
                </Text>
                <Text className="mt-0.5 text-[10px] text-ink-secondary">
                  Queue information updates automatically.
                </Text>
              </View>
              <RefreshCw size={17} color={colors.textMuted} />
            </View>

            {/* STATUS SECTIONS */}
            {statusKeys.map((status) => (
              <View key={status} className="mt-6">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[18px] font-extrabold text-ink-dark">
                      {STATUS_CONFIG[status].label}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-ink-secondary">
                      {STATUS_CONFIG[status].description}
                    </Text>
                  </View>
                  <View className="rounded-full bg-ocean-100 px-3 py-1.5">
                    <Text className="text-[10px] font-extrabold text-ocean-700">
                      {grouped[status].length} jeepneys
                    </Text>
                  </View>
                </View>
                <View className="mt-4">
                  {grouped[status].map((j) => (
                    <JeepneyCard
                      key={j.id}
                      jeepney={j}
                      onPressDetails={() => openDetails(j)}
                    />
                  ))}
                </View>
              </View>
            ))}

            {/* REFRESH HINT */}
            <View className="mt-2 items-center pb-3">
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text className="text-[10px] text-ink-muted">
                  Pull down to refresh queue
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* DETAIL MODAL – unchanged */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 min-h-[40%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-slate-900">
                Jeepney Details
              </Text>
              <TouchableOpacity onPress={closeModal} className="p-1">
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedJeepney && (
              <View className="gap-3">
                <View className="flex-row items-center">
                  <BusFront size={20} color="#0ea5e9" />
                  <Text className="ml-3 text-lg font-semibold text-slate-900">
                    #{selectedJeepney.number}
                  </Text>
                </View>
                {selectedJeepney.jeepName && (
                  <View className="flex-row items-center">
                    <Text className="text-sm text-slate-600 font-medium">
                      Name: {selectedJeepney.jeepName}
                    </Text>
                  </View>
                )}
                {selectedJeepney.driverName && (
                  <View className="flex-row items-center">
                    <Text className="text-sm text-slate-600">
                      Driver: {selectedJeepney.driverName}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center">
                  <MapPin size={18} color="#64748b" />
                  <Text className="ml-3 text-sm text-slate-600">
                    {TERMINAL_NAMES[selectedJeepney.terminalId] || "Unknown"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Clock3 size={18} color="#64748b" />
                  <Text className="ml-3 text-sm text-slate-600">
                    {selectedJeepney.status === "EN_ROUTE"
                      ? "ETA: "
                      : "Est. departure: "}
                    {selectedJeepney.estimatedDeparture}
                    <Text className="text-xs text-slate-400 italic">
                      {" "}
                      (may change)
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Users size={18} color="#64748b" />
                  <Text className="ml-3 text-sm text-slate-600">
                    {selectedJeepney.passengers}/{selectedJeepney.capacity}{" "}
                    passengers
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View
                    className={`px-3 py-1 rounded-full ${
                      STATUS_CONFIG[selectedJeepney.status].container
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        STATUS_CONFIG[selectedJeepney.status].text
                      }`}
                    >
                      {STATUS_CONFIG[selectedJeepney.status].label}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  className="mt-4 bg-ocean-400 py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold">Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </OceanBackground>
  );
}
