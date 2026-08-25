import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BusFront,
  Clock3,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClayCard } from "@/src/shared/components/clay/ClayCard";
import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";
import {
  QueueJeepney,
  RecentTrip,
  useDriverQueue,
} from "@/src/shared/hooks/driver/useJeepneyQueue";

export default function DriverQueueScreen() {
  const router = useRouter();
  const {
    sections,
    recentTrips,
    myJeepneyId,
    waitingCount,
    loadingCount,
    totalCount,
    loading,
    refreshing,
    error,
    refresh,
  } = useDriverQueue();

  const [search, setSearch] = useState("");

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sections;

    return sections.map((section) => ({
      ...section,
      jeepneys: section.jeepneys.filter((jeepney) => {
        return (
          jeepney.plate_number.toLowerCase().includes(query) ||
          (jeepney.jeep_name ?? "").toLowerCase().includes(query) ||
          (jeepney.driver_name ?? "").toLowerCase().includes(query)
        );
      }),
    }));
  }, [sections, search]);

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <ClayCard
              padding={0}
              radiusSize="xxl"
              shadow="default"
              className="h-[72px] w-[72px] items-center justify-center"
            >
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </ClayCard>

            <Text className="mt-4 text-[15px] font-extrabold text-ink-dark">
              Loading queue...
            </Text>

            <Text className="mt-1 text-center text-[11px] font-semibold text-ink-muted">
              Getting the latest jeepney queue
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
          contentContainerClassName="px-6 pb-[140px] pt-2.5"
        >
          {/* HEADER */}

          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="mr-3 h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm"
            >
              <ArrowLeft
                size={19}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>

            <View className="flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                DRIVER
              </Text>

              <Text className="mt-0.5 text-[24px] font-extrabold text-ink-dark">
                Queue
              </Text>
            </View>
          </View>

          <Text className="mt-2 text-[11px] font-medium leading-[17px] text-ink-secondary">
            See the full terminal queue. Your jeepney is highlighted below.
          </Text>

          {/* SEARCH */}

          <View className="mt-5 flex-row items-center rounded-[19px] border border-white/90 bg-clay-surface px-4 shadow-clay-sm">
            <Search size={18} color="#64748B" strokeWidth={2.3} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search jeepney or plate number..."
              placeholderTextColor="#94A3B8"
              className="ml-3 h-[48px] flex-1 text-[12px] font-semibold text-ink-dark"
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                className="h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-100"
              >
                <X size={14} color="#64748B" strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {/* SUMMARY */}

          <View className="mt-5 flex-row">
            <QueueSummaryCard
              label="Queue"
              value={totalCount}
              subtitle="Total"
              icon={
                <BusFront
                  size={18}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              }
            />

            <View className="ml-3 flex-1">
              <QueueSummaryCard
                label="Waiting"
                value={waitingCount}
                subtitle="Ready"
                icon={<Clock3 size={18} color="#B45309" strokeWidth={2.3} />}
              />
            </View>
          </View>

          <View className="mt-3 flex-row">
            <QueueMiniStat
              label="Loading"
              value={loadingCount}
              icon={<Clock3 size={15} color="#B45309" strokeWidth={2.3} />}
            />

            <View className="ml-2 flex-1">
              <QueueMiniStat
                label="Your Position"
                value={
                  sections
                    .flatMap((s) => s.jeepneys)
                    .find((j) => j.id === myJeepneyId)?.queue_position ?? 0
                }
                icon={<BusFront size={15} color="#B45309" strokeWidth={2.3} />}
              />
            </View>
          </View>

          {/* ERROR */}

          {error && (
            <ClayCard
              padding={15}
              radiusSize="xl"
              shadow="small"
              className="mt-4 flex-row items-center"
            >
              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-extrabold text-ink-dark">
                  Unable to load queue
                </Text>

                <Text className="mt-0.5 text-[9px] font-semibold text-ink-secondary">
                  {error}
                </Text>
              </View>

              <Pressable
                onPress={refresh}
                className="rounded-full bg-ocean-100 px-3 py-2"
              >
                <Text className="text-[9px] font-extrabold text-ocean-700">
                  Retry
                </Text>
              </Pressable>
            </ClayCard>
          )}

          {/* TERMINALS */}

          {filteredSections.map((section) => (
            <TerminalQueueSection
              key={section.terminalId}
              terminalName={section.terminalName}
              subtitle={section.subtitle}
              jeepneys={section.jeepneys}
              myJeepneyId={myJeepneyId}
            />
          ))}

          {/* RECENT TRIPS */}

          <RecentTripsSection trips={recentTrips} />
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function QueueSummaryCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <ClayCard padding={16} radiusSize="xxl" shadow="small" className="flex-1">
      <View className="h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.6px] text-ink-muted">
        {label}
      </Text>

      <View className="mt-0.5 flex-row items-end">
        <Text className="text-[25px] font-extrabold text-ink-dark">
          {value}
        </Text>

        <Text className="mb-1 ml-1 text-[9px] font-bold text-ink-muted">
          {subtitle}
        </Text>
      </View>
    </ClayCard>
  );
}

/* ============================================================
   MINI STAT
============================================================ */

function QueueMiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <ClayCard
      padding={12}
      radiusSize="xl"
      shadow="small"
      className="flex-1 flex-row items-center"
    >
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-slate-50">
        {icon}
      </View>

      <View className="ml-2">
        <Text className="text-[8px] font-bold uppercase tracking-[0.3px] text-ink-muted">
          {label}
        </Text>

        <Text className="mt-0.5 text-[13px] font-extrabold text-ink-dark">
          {value || "—"}
        </Text>
      </View>
    </ClayCard>
  );
}

/* ============================================================
   TERMINAL SECTION
============================================================ */

function TerminalQueueSection({
  terminalName,
  subtitle,
  jeepneys,
  myJeepneyId,
}: {
  terminalName: string;
  subtitle: string;
  jeepneys: QueueJeepney[];
  myJeepneyId: string | null;
}) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-1">
          <Text className="text-[17px] font-extrabold text-ink-dark">
            {terminalName}
          </Text>

          <Text className="mt-0.5 text-[10px] font-semibold text-ink-muted">
            {subtitle}
          </Text>
        </View>

        <View className="rounded-full bg-ocean-100 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold text-ocean-700">
            {jeepneys.length}
          </Text>
        </View>
      </View>

      {jeepneys.length === 0 ? (
        <EmptyQueue terminalName={terminalName} />
      ) : (
        jeepneys.map((jeepney) => (
          <QueueJeepneyCard
            key={jeepney.id}
            jeepney={jeepney}
            isMe={!!myJeepneyId && jeepney.id === myJeepneyId}
          />
        ))
      )}
    </View>
  );
}

/* ============================================================
   QUEUE CARD — same clay layout as dispatcher, own jeep highlighted
============================================================ */

function QueueJeepneyCard({
  jeepney,
  isMe,
}: {
  jeepney: QueueJeepney;
  isMe: boolean;
}) {
  const occupancy = Math.min(
    100,
    Math.round(
      (jeepney.current_occupancy / Math.max(jeepney.capacity, 1)) * 100,
    ),
  );

  const status = getStatusPresentation(jeepney.status);

  return (
    <View
      className={`mb-3 overflow-hidden rounded-[23px] ${
        isMe ? "border-2 border-amber-300" : ""
      }`}
    >
      {isMe && (
        <View className="bg-amber-400 px-4 py-1.5">
          <Text className="text-[9px] font-extrabold uppercase tracking-[0.8px] text-amber-950">
            Your Jeepney
          </Text>
        </View>
      )}

      <ClayCard padding={16} radiusSize={isMe ? "none" : "xxl"} shadow="small">
        {/* TOP */}

        <View className="flex-row items-center">
          <View
            className={`h-[47px] w-[47px] items-center justify-center rounded-[15px] ${
              isMe ? "bg-amber-100" : "bg-ocean-100"
            }`}
          >
            <BusFront
              size={23}
              color={isMe ? "#B45309" : colors.primaryDark}
              strokeWidth={2.3}
            />
          </View>

          <View className="ml-3 flex-1">
            <Text
              numberOfLines={1}
              className="text-[13px] font-extrabold text-ink-dark"
            >
              {jeepney.jeep_name || jeepney.plate_number || "Unnamed Jeepney"}
            </Text>

            <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
              {jeepney.plate_number || "No plate number"}
            </Text>
          </View>

          <View className={`rounded-full px-2.5 py-1.5 ${status.background}`}>
            <Text
              className={`text-[8px] font-extrabold uppercase ${status.color}`}
            >
              {status.label}
            </Text>
          </View>
        </View>

        {/* INFO */}

        <View className="mt-4 flex-row">
          <InfoItem
            icon={<Users size={14} color="#64748B" strokeWidth={2.2} />}
            label="Driver"
            value={jeepney.driver_name || "Unassigned"}
          />

          <InfoItem
            icon={<MapPin size={14} color="#64748B" strokeWidth={2.2} />}
            label="Terminal"
            value={getTerminalName(jeepney.terminal_id)}
          />
        </View>

        <View className="mt-3 flex-row">
          <InfoItem
            icon={<Users size={14} color="#64748B" strokeWidth={2.2} />}
            label="Occupancy"
            value={`${jeepney.current_occupancy}/${jeepney.capacity}`}
          />

          <InfoItem
            icon={<Clock3 size={14} color="#64748B" strokeWidth={2.2} />}
            label="Queue"
            value={
              jeepney.queue_position !== null
                ? `#${jeepney.queue_position}`
                : "—"
            }
          />
        </View>

        {/* OCCUPANCY */}

        <View className="mt-4">
          <View className="h-[7px] overflow-hidden rounded-full bg-slate-100">
            <View
              className={`h-full rounded-full ${
                isMe ? "bg-amber-400" : "bg-ocean-400"
              } ${getOccupancyWidth(occupancy)}`}
            />
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[9px] font-semibold text-ink-muted">
              Occupancy
            </Text>

            <Text
              className={`text-[9px] font-extrabold ${
                isMe ? "text-amber-700" : "text-ocean-700"
              }`}
            >
              {occupancy}%
            </Text>
          </View>
        </View>

        {/* FOOTER — GPS status only, no dispatch action for drivers */}

        <View className="mt-4 flex-row items-center">
          <View
            className={`h-[7px] w-[7px] rounded-full ${
              jeepney.last_location_update ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />

          <Text
            className={`ml-1.5 text-[9px] font-bold ${
              jeepney.last_location_update
                ? "text-emerald-700"
                : "text-slate-500"
            }`}
          >
            {jeepney.last_location_update ? "GPS active" : "No recent GPS"}
          </Text>
        </View>
      </ClayCard>
    </View>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 flex-row items-center">
      <View className="h-[29px] w-[29px] items-center justify-center rounded-[10px] bg-slate-50">
        {icon}
      </View>

      <View className="ml-2 flex-1">
        <Text className="text-[8px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-0.5 text-[10px] font-extrabold text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyQueue({ terminalName }: { terminalName: string }) {
  return (
    <ClayCard
      padding={24}
      radiusSize="xxl"
      shadow="small"
      className="items-center"
    >
      <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-ocean-100">
        <BusFront size={24} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        Queue is clear
      </Text>

      <Text className="mt-1 text-center text-[10px] leading-[16px] text-ink-secondary">
        There are currently no jeepneys waiting at {terminalName}.
      </Text>
    </ClayCard>
  );
}

/* ============================================================
   RECENT TRIPS
============================================================ */

function RecentTripsSection({ trips }: { trips: RecentTrip[] }) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-[17px] font-extrabold text-ink-dark">
            Recent Trips
          </Text>

          <Text className="mt-0.5 text-[10px] font-semibold text-ink-muted">
            Latest dispatch activity
          </Text>
        </View>

        <View className="rounded-full bg-ocean-100 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold text-ocean-700">
            {trips.length}
          </Text>
        </View>
      </View>

      <ClayCard padding={0} radiusSize="xxl" shadow="small">
        {trips.length === 0 ? (
          <View className="items-center px-6 py-8">
            <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-ocean-100">
              <Clock3 size={22} color={colors.primaryDark} strokeWidth={2.3} />
            </View>

            <Text className="mt-3 text-[13px] font-extrabold text-ink-dark">
              No recent trips
            </Text>

            <Text className="mt-1 text-center text-[10px] text-ink-secondary">
              Dispatch activity will appear here.
            </Text>
          </View>
        ) : (
          trips.map((trip, index) => (
            <RecentTripRow
              key={trip.id}
              trip={trip}
              last={index === trips.length - 1}
            />
          ))
        )}
      </ClayCard>
    </View>
  );
}

function RecentTripRow({ trip, last }: { trip: RecentTrip; last: boolean }) {
  const jeepneyName =
    trip.jeepney?.jeep_name || trip.jeepney?.plate_number || "Unknown Jeepney";

  const terminal = getTerminalName(trip.jeepney?.terminal_id ?? null);

  return (
    <View
      className={`flex-row items-center px-4 py-4 ${last ? "" : "border-b border-slate-100"}`}
    >
      <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-ocean-100">
        <BusFront size={18} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <View className="ml-3 flex-1">
        <Text
          numberOfLines={1}
          className="text-[11px] font-extrabold text-ink-dark"
        >
          {jeepneyName}
        </Text>

        <Text className="mt-0.5 text-[9px] font-semibold text-ink-muted">
          {trip.route || "Donsol-Daraga"}
        </Text>

        <View className="mt-1 flex-row items-center">
          <MapPin size={10} color="#64748B" strokeWidth={2.3} />

          <Text className="ml-1 text-[8px] font-bold text-ink-secondary">
            {terminal}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <View className="flex-row items-center">
          <Users size={11} color="#64748B" strokeWidth={2.3} />

          <Text className="ml-1 text-[9px] font-extrabold text-ink-dark">
            {trip.total_passengers}
          </Text>
        </View>

        <Text className="mt-1 text-[8px] font-semibold text-ink-muted">
          passengers
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   STATUS / TERMINAL / OCCUPANCY HELPERS
============================================================ */

function getStatusPresentation(status: string) {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting",
        background: "bg-blue-100",
        color: "text-sky-700",
      };
    case "loading":
      return {
        label: "Loading",
        background: "bg-amber-100",
        color: "text-amber-700",
      };
    case "en_route":
      return {
        label: "En Route",
        background: "bg-indigo-100",
        color: "text-indigo-700",
      };
    case "arrived":
      return {
        label: "Arrived",
        background: "bg-emerald-100",
        color: "text-emerald-700",
      };
    case "dispatched":
      return {
        label: "Dispatched",
        background: "bg-sky-100",
        color: "text-sky-700",
      };
    default:
      return {
        label: status || "Inactive",
        background: "bg-slate-100",
        color: "text-slate-500",
      };
  }
}

function getTerminalName(terminalId: number | null) {
  if (terminalId === 1) return "Donsol";
  if (terminalId === 2) return "Daraga";
  return "Unassigned";
}

function getOccupancyWidth(value: number) {
  if (value <= 5) return "w-[5%]";
  if (value <= 10) return "w-[10%]";
  if (value <= 15) return "w-[15%]";
  if (value <= 20) return "w-[20%]";
  if (value <= 25) return "w-[25%]";
  if (value <= 30) return "w-[30%]";
  if (value <= 35) return "w-[35%]";
  if (value <= 40) return "w-[40%]";
  if (value <= 45) return "w-[45%]";
  if (value <= 50) return "w-[50%]";
  if (value <= 55) return "w-[55%]";
  if (value <= 60) return "w-[60%]";
  if (value <= 65) return "w-[65%]";
  if (value <= 70) return "w-[70%]";
  if (value <= 75) return "w-[75%]";
  if (value <= 80) return "w-[80%]";
  if (value <= 85) return "w-[85%]";
  if (value <= 90) return "w-[90%]";
  if (value <= 95) return "w-[95%]";
  return "w-full";
}
