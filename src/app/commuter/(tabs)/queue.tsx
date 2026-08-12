import {
  ArrowRight,
  BusFront,
  Check,
  Clock3,
  MapPin,
  RefreshCw,
  Users
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../src/shared/constants/theme";

type JeepneyStatus = "ARRIVED" | "LOADING" | "READY" | "DEPARTED";

interface Jeepney {
  id: string;
  number: string;
  status: JeepneyStatus;
  passengers: number;
  capacity: number;
  estimatedDeparture: string;
}

const INITIAL_JEEPNEYS: Jeepney[] = [
  {
    id: "jeep-01",
    number: "01",
    status: "DEPARTED",
    passengers: 16,
    capacity: 16,
    estimatedDeparture: "8:05 AM",
  },
  {
    id: "jeep-02",
    number: "02",
    status: "DEPARTED",
    passengers: 15,
    capacity: 16,
    estimatedDeparture: "8:15 AM",
  },
  {
    id: "jeep-03",
    number: "03",
    status: "ARRIVED",
    passengers: 5,
    capacity: 16,
    estimatedDeparture: "8:25 AM",
  },
  {
    id: "jeep-04",
    number: "04",
    status: "LOADING",
    passengers: 11,
    capacity: 16,
    estimatedDeparture: "8:30 AM",
  },
  {
    id: "jeep-05",
    number: "05",
    status: "READY",
    passengers: 14,
    capacity: 16,
    estimatedDeparture: "8:35 AM",
  },
];

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

  READY: {
    label: "Ready",
    description: "Almost ready for departure.",
    icon: <Check size={16} color="#16A34A" strokeWidth={2.5} />,
    container: "bg-green-100",
    text: "text-green-700",
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

  if (percentage >= 100) {
    return "Full";
  }

  if (percentage >= 80) {
    return "Almost full";
  }

  if (percentage >= 50) {
    return "Moderate";
  }

  return "Seats available";
}

function JeepneyCard({ jeepney }: { jeepney: Jeepney }) {
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
      {/* TOP */}
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

      {/* STATUS DESCRIPTION */}
      <Text className="mt-4 text-[11px] text-ink-secondary">
        {status.description}
      </Text>

      {/* OCCUPANCY */}
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
            style={{
              width: `${occupancy}%`,
            }}
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

      {/* DEPARTURE */}
      <View className="mt-5 flex-row items-center rounded-[18px] bg-ocean-50 px-4 py-3">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white">
          <Clock3 size={16} color={colors.primaryDark} strokeWidth={2.3} />
        </View>

        <View className="ml-3">
          <Text className="text-[9px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Estimated departure
          </Text>

          <Text className="mt-0.5 text-[14px] font-extrabold text-ink-dark">
            {jeepney.estimatedDeparture}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function CommuterQueueScreen() {
  const [jeepneys, setJeepneys] = useState<Jeepney[]>(INITIAL_JEEPNEYS);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    /*
     * TEMPORARY REFRESH.
     *
     * Later this will trigger a realtime/data
     * refresh from Supabase.
     */
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  const activeJeepneys = jeepneys.filter(
    (jeepney) => jeepney.status !== "DEPARTED",
  );

  const departedJeepneys = jeepneys.filter(
    (jeepney) => jeepney.status === "DEPARTED",
  );

  const nextJeepney = activeJeepneys.length > 0 ? activeJeepneys[0] : null;

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
          contentContainerStyle={{
            paddingBottom: 120,
          }}
        >
          <View className="px-5 pt-4">
            {/* =================================================
                HEADER
            ================================================== */}
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
                  Donsol Terminal → Daraga
                </Text>
              </View>
            </View>

            {/* =================================================
                QUEUE SUMMARY
            ================================================== */}
            <View className="mt-6 rounded-[28px] border border-white/90 bg-ocean-400 p-5 shadow-clay-floating">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/70">
                    Current queue
                  </Text>

                  <Text className="mt-2 text-[40px] font-extrabold leading-[43px] text-white">
                    {activeJeepneys.length}
                  </Text>

                  <Text className="mt-1 text-[12px] font-medium text-white/80">
                    jeepneys waiting
                  </Text>
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
                    {nextJeepney?.estimatedDeparture ?? "No jeepney available"}
                  </Text>
                </View>
              </View>
            </View>

            {/* =================================================
                LIVE STATUS
            ================================================== */}
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

            {/* =================================================
                ACTIVE JEEPNEYS
            ================================================== */}
            <View className="mt-7 flex-row items-center justify-between">
              <View>
                <Text className="text-[18px] font-extrabold text-ink-dark">
                  Waiting jeepneys
                </Text>

                <Text className="mt-1 text-[10px] text-ink-secondary">
                  First-in, first-out terminal queue
                </Text>
              </View>

              <View className="rounded-full bg-ocean-100 px-3 py-1.5">
                <Text className="text-[10px] font-extrabold text-ocean-700">
                  {activeJeepneys.length} active
                </Text>
              </View>
            </View>

            <View className="mt-4">
              {activeJeepneys.map((jeepney) => (
                <JeepneyCard key={jeepney.id} jeepney={jeepney} />
              ))}
            </View>

            {/* =================================================
                QUEUE EXPLANATION
            ================================================== */}
            <View className="mt-1 rounded-[24px] border border-ocean-200 bg-ocean-100/70 p-4">
              <View className="flex-row items-start">
                <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-white/80">
                  <TicketIcon />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[12px] font-extrabold text-ink-dark">
                    How the queue works
                  </Text>

                  <Text className="mt-1 text-[10px] leading-[16px] text-ink-secondary">
                    Jeepneys are dispatched according to their terminal queue
                    order. When a jeepney arrives, it joins the end of the
                    queue.
                  </Text>
                </View>
              </View>
            </View>

            {/* =================================================
                DEPARTED
            ================================================== */}
            {departedJeepneys.length > 0 && (
              <>
                <View className="mt-7">
                  <Text className="text-[18px] font-extrabold text-ink-dark">
                    Recent departures
                  </Text>

                  <Text className="mt-1 text-[10px] text-ink-secondary">
                    Jeepneys that have already left
                  </Text>
                </View>

                <View className="mt-4">
                  {departedJeepneys.map((jeepney) => (
                    <JeepneyCard key={jeepney.id} jeepney={jeepney} />
                  ))}
                </View>
              </>
            )}

            {/* =================================================
                REFRESH HINT
            ================================================== */}
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
    </OceanBackground>
  );
}

function TicketIcon() {
  return (
    <View className="h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 border-ocean-600">
      <View className="h-[4px] w-[4px] rounded-full bg-ocean-600" />
    </View>
  );
}
