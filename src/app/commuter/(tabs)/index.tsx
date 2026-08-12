import { supabase } from "@/src/shared/config/supabase";
import { router } from "expo-router";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Ticket,
  Users,
  Wifi,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";
import { useCommuterStore } from "../../../src/shared/store/commuterStore";

type Terminal = {
  id: string;
  name: string;
  destination: string;
  status: "Active" | "Inactive";
};

type Jeepney = {
  id: string;
  number: string;
  capacity: number;
  current_status: "Loading" | "Departing" | "Arriving";
};

type QueueEntry = {
  id: string;
  position: number;
  jeepney_id: string;
  status: "waiting" | "boarding" | "completed";
};

export default function CommuterHomeScreen() {
  const profile = useCommuterStore((state) => state.profile);
  const commuterName = profile?.name?.trim() || "Commuter";

  // ─── STATE ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [nextJeepney, setNextJeepney] = useState<Jeepney | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [passengers, setPassengers] = useState<number>(0);

  // ─── DATA FETCH ──────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // 1️⃣ Get the current terminal (assuming only one active terminal)
      // If multiple, you might store terminal_id in user profile.
      const { data: terminalData, error: terminalError } = await supabase
        .from("terminals")
        .select("*")
        .eq("status", "Active")
        .single();

      if (terminalError) throw terminalError;
      setTerminal(terminalData);

      // 2️⃣ Get the next jeepney for this terminal
      // Assuming you have a table `jeepneys` and a relationship to terminal.
      const { data: jeepneyData, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select("id, number, capacity, current_status")
        .eq("terminal_id", terminalData.id)
        .eq("current_status", "Loading")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (jeepneyError) throw jeepneyError;
      setNextJeepney(jeepneyData);

      // 3️⃣ Get current passenger count for that jeepney (if any)
      if (jeepneyData) {
        const { count, error: countError } = await supabase
          .from("queue_entries")
          .select("*", { count: "exact", head: true })
          .eq("jeepney_id", jeepneyData.id)
          .eq("status", "waiting");

        if (!countError) setPassengers(count || 0);
      }

      // 4️⃣ Get the current user's queue position (if they are in queue)
      if (profile?.id) {
        const { data: queueData, error: queueError } = await supabase
          .from("queue_entries")
          .select("position, status, jeepney_id")
          .eq("user_id", profile.id)
          .eq("status", "waiting")
          .maybeSingle();

        if (!queueError && queueData) {
          setQueuePosition(queueData.position);
        } else {
          setQueuePosition(null);
        }
      }

      // 5️⃣ Get total queue count for the terminal (sum of waiting entries)
      const { count: totalCount, error: totalError } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("status", "waiting");

      if (!totalError) setQueueCount(totalCount || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ─── HANDLERS ────────────────────────────────────────────────────
  const handleQueuePress = () => router.push("./queue");
  const handleMapPress = () => router.push("./map");
  const handleAlertsPress = () => router.push("./notifications");

  // ─── RENDER ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <OceanBackground intensity={0.22}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primaryDark} />
          <Text className="mt-4 text-[13px] font-semibold text-ink-secondary">
            Loading dashboard...
          </Text>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  // Provide fallback values if data is missing
  const terminalName = terminal?.name ?? "Donsol Terminal";
  const terminalDest = terminal?.destination ?? "Daraga";
  const terminalStatus = terminal?.status ?? "Active";

  const jeepneyNumber = nextJeepney?.number ?? "--";
  const jeepneyStatus = nextJeepney?.current_status ?? "Loading";
  const jeepneyCapacity = nextJeepney?.capacity ?? 16;
  const currentPassengers = passengers ?? 0;
  const occupancy =
    jeepneyCapacity > 0 ? (currentPassengers / jeepneyCapacity) * 100 : 0;

  const displayQueuePos = queuePosition ?? "–";
  const totalQueue = queueCount ?? 0;

  return (
    <OceanBackground intensity={0.22}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="px-5 pt-4">
            {/* HEADER */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[12px] font-semibold text-ocean-700">
                  {terminalName.toUpperCase()}
                </Text>
                <Text className="mt-1 text-[25px] font-extrabold text-ink-dark">
                  Hello, {commuterName} 👋
                </Text>
                <View className="mt-2 flex-row items-center">
                  <MapPin
                    size={14}
                    color={colors.primaryDark}
                    strokeWidth={2.2}
                  />
                  <Text className="ml-1 text-[12px] font-medium text-ink-secondary">
                    {terminalName} → {terminalDest}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleAlertsPress}
                className="relative h-[48px] w-[48px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface shadow-clay-sm active:scale-95"
              >
                <Bell size={21} color={colors.primaryDark} strokeWidth={2.2} />
                <View className="absolute right-[9px] top-[8px] h-[8px] w-[8px] rounded-full bg-red-500" />
              </Pressable>
            </View>

            {/* TERMINAL STATUS */}
            <View className="mt-6 flex-row items-center rounded-[22px] border border-white/90 bg-clay-surface/90 px-4 py-3 shadow-clay-sm">
              <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-green-100">
                <Wifi size={18} color="#16A34A" strokeWidth={2.4} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-ink-muted">
                  Terminal status
                </Text>
                <Text className="mt-0.5 text-[13px] font-bold text-ink-dark">
                  {terminalName}
                </Text>
              </View>
              <View className="flex-row items-center rounded-full bg-green-100 px-3 py-1.5">
                <View className="mr-1.5 h-[7px] w-[7px] rounded-full bg-green-500" />
                <Text className="text-[10px] font-bold text-green-700">
                  {terminalStatus}
                </Text>
              </View>
            </View>

            {/* NEXT JEEPNEY CARD */}
            <View className="mt-5 overflow-hidden rounded-[30px] border border-white/90 bg-ocean-400 p-5 shadow-clay-floating">
              <View className="absolute -right-[50px] -top-[50px] h-[160px] w-[160px] rounded-full bg-white/10" />
              <View className="absolute -bottom-[70px] -left-[50px] h-[170px] w-[170px] rounded-full bg-white/10" />

              <View className="flex-row items-start justify-between">
                <View>
                  <View className="flex-row items-center">
                    <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-white/20">
                      <Navigation size={15} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                    <Text className="ml-2 text-[10px] font-bold tracking-[1px] text-white/80">
                      NEXT JEEPNEY
                    </Text>
                  </View>
                  <Text className="mt-4 text-[42px] font-extrabold leading-[45px] text-white">
                    #{jeepneyNumber}
                  </Text>
                  <Text className="mt-1 text-[13px] font-medium text-white/80">
                    {terminalName} → {terminalDest}
                  </Text>
                </View>
                <View className="rounded-full bg-white/20 px-3 py-1.5">
                  <Text className="text-[10px] font-bold text-white">
                    {jeepneyStatus}
                  </Text>
                </View>
              </View>

              {/* Occupancy */}
              <View className="mt-7">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Users size={15} color="#FFFFFF" strokeWidth={2.3} />
                    <Text className="ml-2 text-[11px] font-bold text-white/90">
                      Occupancy
                    </Text>
                  </View>
                  <Text className="text-[12px] font-extrabold text-white">
                    {currentPassengers}/{jeepneyCapacity}
                  </Text>
                </View>
                <View className="mt-2 h-[9px] overflow-hidden rounded-full bg-white/20">
                  <View
                    className="h-full rounded-full bg-white"
                    style={{ width: `${Math.min(occupancy, 100)}%` }}
                  />
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[10px] text-white/70">
                    {occupancy >= 80 ? "Almost full" : "Seats available"}
                  </Text>
                  <Text className="text-[10px] font-semibold text-white/80">
                    {jeepneyCapacity - currentPassengers} seats left
                  </Text>
                </View>
              </View>

              {/* Departure – static placeholder; replace with real ETA if available */}
              <View className="mt-5 flex-row items-center rounded-[19px] bg-white/15 px-4 py-3">
                <Clock3 size={18} color="#FFFFFF" strokeWidth={2.2} />
                <View className="ml-3">
                  <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-white/60">
                    Estimated departure
                  </Text>
                  <Text className="mt-0.5 text-[17px] font-extrabold text-white">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* QUEUE + MAP QUICK ACTIONS */}
            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={handleQueuePress}
                className="flex-1 rounded-[24px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm active:scale-[0.98]"
              >
                <View className="flex-row items-center justify-between">
                  <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                    <Ticket
                      size={20}
                      color={colors.primaryDark}
                      strokeWidth={2.2}
                    />
                  </View>
                  <ChevronRight size={17} color={colors.textMuted} />
                </View>
                <Text className="mt-4 text-[11px] font-bold uppercase tracking-[0.5px] text-ink-muted">
                  Your queue
                </Text>
                <Text className="mt-1 text-[25px] font-extrabold text-ink-dark">
                  #{displayQueuePos}
                </Text>
                <Text className="mt-1 text-[10px] text-ink-secondary">
                  {queuePosition !== null
                    ? "Position in queue"
                    : "Not in queue"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleMapPress}
                className="flex-1 rounded-[24px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm active:scale-[0.98]"
              >
                <View className="flex-row items-center justify-between">
                  <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                    <MapPin
                      size={20}
                      color={colors.primaryDark}
                      strokeWidth={2.2}
                    />
                  </View>
                  <ChevronRight size={17} color={colors.textMuted} />
                </View>
                <Text className="mt-4 text-[11px] font-bold uppercase tracking-[0.5px] text-ink-muted">
                  Live map
                </Text>
                <Text className="mt-1 text-[15px] font-extrabold text-ink-dark">
                  Track jeepneys
                </Text>
                <Text className="mt-1 text-[10px] text-ink-secondary">
                  View active trips
                </Text>
              </Pressable>
            </View>

            {/* QUEUE SUMMARY */}
            <View className="mt-5 rounded-[26px] border border-white/90 bg-clay-surface p-5 shadow-clay-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[11px] font-bold uppercase tracking-[0.7px] text-ocean-700">
                    Terminal queue
                  </Text>
                  <Text className="mt-1 text-[19px] font-extrabold text-ink-dark">
                    {totalQueue} jeepneys waiting
                  </Text>
                </View>
                <Pressable
                  onPress={handleQueuePress}
                  className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ocean-100"
                >
                  <ArrowRight
                    size={17}
                    color={colors.primaryDark}
                    strokeWidth={2.5}
                  />
                </Pressable>
              </View>
              <View className="mt-5 flex-row items-center">
                <View className="h-[8px] flex-1 overflow-hidden rounded-full bg-ocean-100">
                  <View
                    className="h-full rounded-full bg-ocean-400"
                    style={{
                      width: `${totalQueue > 0 ? Math.min((totalQueue / 20) * 100, 100) : 0}%`,
                    }}
                  />
                </View>
                <Text className="ml-3 text-[10px] font-semibold text-ink-secondary">
                  {totalQueue < 5
                    ? "Short wait"
                    : totalQueue < 15
                      ? "Moderate wait"
                      : "Long wait"}
                </Text>
              </View>
            </View>

            {/* INFORMATION CARD */}
            <View className="mt-5 flex-row items-center rounded-[22px] border border-ocean-200 bg-ocean-100/70 p-4">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/80">
                <Clock3
                  size={19}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-bold text-ink-dark">
                  Plan your trip
                </Text>
                <Text className="mt-1 text-[10px] leading-[15px] text-ink-secondary">
                  Queue information updates automatically as jeepneys arrive and
                  depart.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}
