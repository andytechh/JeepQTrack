import {
  Activity,
  Bus,
  ChevronRight,
  MapPin,
  RefreshCw,
  Search,
  Users,
  X
} from "lucide-react-native";
import { useMemo } from "react";
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

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";
import {
  JeepneyFilter,
  useAdminJeepneys,
} from "../../../../src/shared/hooks/admin/useAdminJeepney";

export default function AdminJeepneysScreen() {
  const {
    filteredJeepneys,

    loading,
    refreshing,
    error,

    search,
    filter,

    setSearch,
    setFilter,

    refresh,

    totalCount,
    activeCount,
    waitingCount,
    loadingCount,
    enRouteCount,
    inactiveCount,

    getTerminalName,
  } = useAdminJeepneys();

  const filters = useMemo(
    () =>
      [
        {
          key: "all",
          label: "All",
          count: totalCount,
        },
        {
          key: "active",
          label: "Active",
          count: activeCount,
        },
        {
          key: "waiting",
          label: "Waiting",
          count: waitingCount,
        },
        {
          key: "loading",
          label: "Loading",
          count: loadingCount,
        },
        {
          key: "en_route",
          label: "En Route",
          count: enRouteCount,
        },
        {
          key: "inactive",
          label: "Inactive",
          count: inactiveCount,
        },
      ] as {
        key: JeepneyFilter;
        label: string;
        count: number;
      }[],
    [
      totalCount,
      activeCount,
      waitingCount,
      loadingCount,
      enRouteCount,
      inactiveCount,
    ],
  );
  function JeepneyCard({
    jeepney,
    terminalName,
  }: {
    jeepney: any;
    terminalName: string;
  }) {
    const occupancy = jeepney.current_occupancy ?? 0;

    const capacity = jeepney.capacity ?? 0;

    const occupancyPercent =
      capacity > 0
        ? Math.min(100, Math.round((occupancy / capacity) * 100))
        : 0;

    return (
      <Pressable
        className="mb-3 rounded-[24px] border border-white/90 bg-white/90 p-4"
        style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row">
          {/* ICON */}

          <View className="h-[50px] w-[50px] items-center justify-center rounded-[17px] bg-ocean-100">
            <Bus size={23} color={colors.primaryDark} strokeWidth={2.3} />
          </View>

          {/* MAIN */}

          <View className="ml-3 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-ink-dark">
                  {jeepney.jeep_name || "Unnamed Jeepney"}
                </Text>

                <Text className="mt-0.5 text-[11px] font-semibold text-ink-secondary">
                  {jeepney.plate_number}
                </Text>
              </View>

              <StatusBadge status={jeepney.status} />
            </View>

            {/* QUEUE */}

            <View className="mt-4 flex-row items-center justify-between rounded-[16px] bg-slate-50 px-3 py-2.5">
              <View className="flex-row items-center">
                <Activity
                  size={15}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />

                <View className="ml-2">
                  <Text className="text-[9px] font-semibold uppercase tracking-[0.7px] text-ink-muted">
                    Queue
                  </Text>

                  <Text className="mt-0.5 text-[12px] font-extrabold text-ink-dark">
                    {jeepney.queue_position != null
                      ? `Position #${jeepney.queue_position}`
                      : "Not in queue"}
                  </Text>
                </View>
              </View>

              <ChevronRight size={17} color={colors.textMuted} />
            </View>

            {/* STATS */}

            <View className="mt-3 flex-row">
              <MiniStat
                icon={<Users size={14} color={colors.primaryDark} />}
                label="Occupancy"
                value={`${occupancy}/${capacity}`}
              />

              <MiniStat
                icon={<MapPin size={14} color={colors.primaryDark} />}
                label="Terminal"
                value={terminalName.replace(" Terminal", "")}
              />
            </View>

            {/* OCCUPANCY BAR */}

            <View className="mt-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-[9px] font-semibold text-ink-muted">
                  Passenger load
                </Text>

                <Text className="text-[9px] font-extrabold text-ocean-700">
                  {occupancyPercent}%
                </Text>
              </View>

              <View className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-ocean-100">
                <View
                  className="h-full rounded-full bg-ocean-400"
                  style={{
                    width: `${occupancyPercent}%`,
                  }}
                />
              </View>
            </View>

            {/* DRIVER */}

            <View className="mt-3 flex-row items-center">
              <View className="h-[7px] w-[7px] rounded-full bg-emerald-400" />

              <Text
                numberOfLines={1}
                className="ml-2 flex-1 text-[10px] font-semibold text-ink-secondary"
              >
                {jeepney.driver_name || "No driver assigned"}
              </Text>

              <Text className="text-[9px] font-medium text-ink-muted">
                Bracket {jeepney.bracket}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const config: Record<
      string,
      {
        label: string;
        bg: string;
        text: string;
      }
    > = {
      waiting: {
        label: "WAITING",
        bg: "#DCFCE7",
        text: "#15803D",
      },
      loading: {
        label: "LOADING",
        bg: "#FEF3C7",
        text: "#B45309",
      },
      en_route: {
        label: "EN ROUTE",
        bg: "#DBEAFE",
        text: "#1D4ED8",
      },
      arrived: {
        label: "ARRIVED",
        bg: "#E0F2FE",
        text: "#0369A1",
      },
      dispatched: {
        label: "DISPATCHED",
        bg: "#E0E7FF",
        text: "#4338CA",
      },
      inactive: {
        label: "INACTIVE",
        bg: "#F1F5F9",
        text: "#64748B",
      },
    };

    const current = config[status] ?? config.inactive;

    return (
      <View
        className="rounded-full px-2.5 py-1.5"
        style={{
          backgroundColor: current.bg,
        }}
      >
        <Text
          className="text-[8px] font-extrabold"
          style={{
            color: current.text,
          }}
        >
          {current.label}
        </Text>
      </View>
    );
  }

  function MiniStat({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
  }) {
    return (
      <View className="mr-3 flex-1 flex-row items-center rounded-[14px] bg-slate-50 px-2.5 py-2">
        {icon}

        <View className="ml-1.5 flex-1">
          <Text className="text-[8px] font-semibold text-ink-muted">
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

  function LoadingState() {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-[62px] w-[62px] items-center justify-center rounded-[22px] border border-white/90 bg-white/90">
          <ActivityIndicator size="small" color={colors.primaryDark} />
        </View>

        <Text className="mt-4 text-[13px] font-semibold text-ink-secondary">
          Loading fleet...
        </Text>
      </View>
    );
  }

  function ErrorState({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => Promise<void>;
  }) {
    return (
      <View className="mt-8 mx-6 rounded-[24px] border border-red-100 bg-white/90 p-5">
        <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-red-50">
          <X size={22} color="#DC2626" strokeWidth={2.4} />
        </View>

        <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
          Unable to load fleet
        </Text>

        <Text className="mt-2 text-[12px] leading-[18px] text-ink-secondary">
          {message}
        </Text>

        <Pressable
          onPress={onRetry}
          className="mt-5 min-h-[48px] flex-row items-center justify-center rounded-full bg-ocean-400 px-5"
        >
          <RefreshCw size={17} color="#FFFFFF" strokeWidth={2.5} />

          <Text className="ml-2 text-[13px] font-extrabold text-white">
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  function EmptyState({ searching }: { searching: boolean }) {
    return (
      <View className="mt-14 items-center px-6">
        <View className="h-[82px] w-[82px] items-center justify-center rounded-[28px] border border-white/90 bg-clay-surface">
          {searching ? (
            <Search size={29} color={colors.primaryDark} strokeWidth={2} />
          ) : (
            <Bus size={29} color={colors.primaryDark} strokeWidth={2} />
          )}
        </View>

        <Text className="mt-5 text-center text-[18px] font-extrabold text-ink-dark">
          {searching ? "No jeepneys found" : "No jeepneys available"}
        </Text>

        <Text className="mt-2 max-w-[290px] text-center text-[12px] leading-[19px] text-ink-secondary">
          {searching
            ? "Try a different plate number, jeepney name, or driver."
            : "Jeepneys registered in the system will appear here."}
        </Text>
      </View>
    );
  }

  return (
    <OceanBackground intensity={0.32}>
      <SafeAreaView className="flex-1">
        <View className="flex-1">
          {/* HEADER */}

          <View className="px-6 pt-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface shadow-clay-sm">
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ocean-100">
                    <Bus
                      size={21}
                      color={colors.primaryDark}
                      strokeWidth={2.4}
                    />
                  </View>
                </View>

                <View className="ml-3">
                  <Text className="text-[11px] font-bold uppercase tracking-[1.3px] text-ocean-700">
                    Fleet Control
                  </Text>

                  <Text className="mt-0.5 text-[24px] font-extrabold text-ink-dark">
                    Jeepneys
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={refresh}
                className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/90 bg-white/80"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <RefreshCw
                    size={18}
                    color={colors.primaryDark}
                    strokeWidth={2.3}
                  />
                )}
              </Pressable>
            </View>

            <Text className="mt-3 text-[12px] text-ink-secondary">
              Monitor the fleet, queue and operating status.
            </Text>

            {/* SEARCH */}

            <View className="mt-4 flex-row items-center rounded-[18px] border border-white/90 bg-white/85 px-4">
              <Search size={18} color={colors.textMuted} strokeWidth={2.2} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search plate, jeepney or driver..."
                placeholderTextColor={colors.textMuted}
                className="ml-2 h-[48px] flex-1 text-[13px] font-medium text-ink-dark"
              />

              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")}>
                  <X size={17} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* FILTERS */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{
                paddingRight: 20,
              }}
            >
              {filters.map((item) => {
                const selected = filter === item.key;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    className={`mr-2 flex-row items-center rounded-full px-3.5 py-2.5 ${
                      selected ? "bg-ocean-400" : "bg-white/80"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-extrabold ${
                        selected ? "text-white" : "text-ink-secondary"
                      }`}
                    >
                      {item.label}
                    </Text>

                    <View
                      className={`ml-1.5 min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${
                        selected ? "bg-white/20" : "bg-ocean-100"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-extrabold ${
                          selected ? "text-white" : "text-ocean-700"
                        }`}
                      >
                        {item.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* CONTENT */}

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : (
            <ScrollView
              className="mt-4 flex-1 px-6"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={colors.primaryDark}
                />
              }
              contentContainerStyle={{
                paddingBottom: 130,
              }}
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[11px] font-bold uppercase tracking-[1px] text-ocean-700">
                  Fleet
                </Text>

                <Text className="text-[10px] font-medium text-ink-muted">
                  {filteredJeepneys.length} displayed
                </Text>
              </View>

              {filteredJeepneys.length === 0 ? (
                <EmptyState searching={search.length > 0} />
              ) : (
                filteredJeepneys.map((jeepney) => (
                  <JeepneyCard
                    key={jeepney.id}
                    jeepney={jeepney}
                    terminalName={getTerminalName(jeepney.terminal_id)}
                  />
                ))
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}
