import {
  Activity,
  BarChart3,
  BusFront,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Route,
  TrendingUp,
  UserRound,
  Users,
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
  MonitoringPeriod,
  useAdminMonitoring,
} from "@/src/shared/hooks/admin/useAdminMonitoring";

const PERIODS: {
  label: string;
  value: MonitoringPeriod;
}[] = [
  {
    label: "Today",
    value: "today",
  },
  {
    label: "7 Days",
    value: "7d",
  },
  {
    label: "30 Days",
    value: "30d",
  },
  {
    label: "All",
    value: "all",
  },
];

export default function AdminMonitoringScreen() {
  const {
    trips,
    activityLogs,
    stats,
    terminalStats,
    staffStats,
    jeepneyStats,
    dailyTrips,
    dailyActivity,
    actionStats,
    loading,
    refreshing,
    error,
    period,
    setPeriod,
    refresh,
  } = useAdminMonitoring();

  const maxTerminalTrips = useMemo(() => {
    return Math.max(...(terminalStats ?? []).map((item) => item.totalTrips), 1);
  }, [terminalStats]);

  const maxJeepneyTrips = useMemo(() => {
    return Math.max(...(jeepneyStats ?? []).map((item) => item.totalTrips), 1);
  }, [jeepneyStats]);

  const maxDailyTrips = useMemo(() => {
    return Math.max(...(dailyTrips ?? []).map((item) => item.trips), 1);
  }, [dailyTrips]);

  const maxDailyActivity = useMemo(() => {
    return Math.max(...(dailyActivity ?? []).map((item) => item.count), 1);
  }, [dailyActivity]);

  const maxActionCount = useMemo(() => {
    return Math.max(...(actionStats ?? []).map((item) => item.count), 1);
  }, [actionStats]);

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading monitoring...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Preparing activity logs and reports
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
            paddingTop: 14,
            paddingBottom: 140,
          }}
        >
          {/* HEADER */}

          <View className="flex-row items-center">
            <View className="h-[50px] w-[50px] items-center justify-center rounded-[18px] bg-ocean-100">
              <Activity
                size={24}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                ADMIN MONITORING
              </Text>

              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                Logs & Reports
              </Text>
            </View>

            <Pressable
              onPress={refresh}
              className="h-[42px] w-[42px] items-center justify-center rounded-full bg-clay-surface"
            >
              <RefreshCw
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          <Text className="mt-2 text-[11px] leading-[17px] text-ink-secondary">
            Monitor staff activity, trips, passengers, terminals, and fleet
            performance.
          </Text>

          {/* PERIOD FILTER */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-5"
          >
            {PERIODS.map((item) => {
              const selected = period === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setPeriod(item.value)}
                  className={`mr-2 rounded-full px-4 py-2.5 ${
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
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ERROR */}

          {error && (
            <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
              <Text className="text-[14px] font-extrabold text-ink-dark">
                Monitoring unavailable
              </Text>

              <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                {error}
              </Text>

              <Pressable
                onPress={refresh}
                className="mt-4 flex-row items-center justify-center rounded-full bg-ocean-400 py-3"
              >
                <RefreshCw size={15} color="#FFFFFF" strokeWidth={2.4} />

                <Text className="ml-2 text-[11px] font-extrabold text-white">
                  Retry
                </Text>
              </Pressable>
            </View>
          )}

          {/* SUMMARY */}

          <View className="mt-6 flex-row flex-wrap justify-between">
            <StatCard
              icon={<Route size={19} color={colors.primaryDark} />}
              label="Total Trips"
              value={stats.totalTrips.toLocaleString()}
            />

            <StatCard
              icon={<Users size={19} color={colors.primaryDark} />}
              label="Passengers"
              value={stats.totalPassengers.toLocaleString()}
            />

            <StatCard
              icon={<CheckCircle2 size={19} color={colors.primaryDark} />}
              label="Completed"
              value={stats.completedTrips.toLocaleString()}
            />

            <StatCard
              icon={<Clock3 size={19} color={colors.primaryDark} />}
              label="Avg Trip"
              value={`${Math.round(stats.averageTripDuration / 60)} min`}
            />

            <StatCard
              icon={<BusFront size={19} color={colors.primaryDark} />}
              label="Active Jeepneys"
              value={`${stats.activeJeepneys}/${stats.totalJeepneys}`}
            />

            <StatCard
              icon={<Activity size={19} color={colors.primaryDark} />}
              label="Activity Logs"
              value={stats.totalActivityLogs.toLocaleString()}
            />
          </View>

          {/* TRIP PERFORMANCE */}

          <SectionTitle
            icon={<TrendingUp size={18} color={colors.primaryDark} />}
            title="Trip Performance"
            subtitle="Recorded trips and passenger movement"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[12px] font-extrabold text-ink-dark">
              Daily Trips
            </Text>

            <Text className="mt-1 text-[10px] text-ink-muted">
              Trip volume during the selected period
            </Text>

            {(dailyTrips ?? []).length === 0 ? (
              <EmptyCard label="No trip data available." />
            ) : (
              <View className="mt-6 h-[180px] flex-row items-end">
                {(dailyTrips ?? []).slice(-14).map((item) => {
                  const height = (item.trips / maxDailyTrips) * 120;

                  return (
                    <View key={item.date} className="flex-1 items-center">
                      <Text className="mb-1 text-[8px] font-extrabold text-ink-secondary">
                        {item.trips}
                      </Text>

                      <View
                        className="w-[15px] rounded-t-[8px] bg-ocean-400"
                        style={{
                          height: Math.max(height, 6),
                        }}
                      />

                      <Text
                        numberOfLines={1}
                        className="mt-2 text-[7px] text-ink-muted"
                      >
                        {formatShortDate(item.date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* PASSENGER GRAPH */}

          <View className="mt-3 rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[12px] font-extrabold text-ink-dark">
              Passenger Volume
            </Text>

            <Text className="mt-1 text-[10px] text-ink-muted">
              Passengers carried per day
            </Text>

            {(dailyTrips ?? []).length === 0 ? (
              <EmptyCard label="No passenger data available." />
            ) : (
              <View className="mt-6 h-[180px] flex-row items-end">
                {(dailyTrips ?? []).slice(-14).map((item) => {
                  const maxPassengers = Math.max(
                    ...(dailyTrips ?? []).map((entry) => entry.passengers),
                    1,
                  );

                  const height = (item.passengers / maxPassengers) * 120;

                  return (
                    <View key={item.date} className="flex-1 items-center">
                      <Text className="mb-1 text-[7px] font-extrabold text-ink-secondary">
                        {item.passengers}
                      </Text>

                      <View
                        className="w-[15px] rounded-t-[8px] bg-ocean-300"
                        style={{
                          height: Math.max(height, 6),
                        }}
                      />

                      <Text
                        numberOfLines={1}
                        className="mt-2 text-[7px] text-ink-muted"
                      >
                        {formatShortDate(item.date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ACTIVITY GRAPH */}

          <View className="mt-3 rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[12px] font-extrabold text-ink-dark">
              Activity Volume
            </Text>

            <Text className="mt-1 text-[10px] text-ink-muted">
              Staff and system activity recorded each day
            </Text>

            {(dailyActivity ?? []).length === 0 ? (
              <EmptyCard label="No activity data available." />
            ) : (
              <View className="mt-6 h-[180px] flex-row items-end">
                {(dailyActivity ?? []).slice(-14).map((item) => {
                  const height = (item.count / maxDailyActivity) * 120;

                  return (
                    <View key={item.date} className="flex-1 items-center">
                      <Text className="mb-1 text-[7px] font-extrabold text-ink-secondary">
                        {item.count}
                      </Text>

                      <View
                        className="w-[15px] rounded-t-[8px] bg-ocean-500"
                        style={{
                          height: Math.max(height, 6),
                        }}
                      />

                      <Text
                        numberOfLines={1}
                        className="mt-2 text-[7px] text-ink-muted"
                      >
                        {formatShortDate(item.date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* TERMINALS */}

          <SectionTitle
            icon={<BarChart3 size={18} color={colors.primaryDark} />}
            title="Terminal Performance"
            subtitle="Donsol vs Daraga"
          />

          {(terminalStats ?? []).length === 0 ? (
            <EmptyCard label="No terminal data available." />
          ) : (
            terminalStats.map((terminal) => {
              const width = (terminal.totalTrips / maxTerminalTrips) * 100;

              return (
                <View
                  key={terminal.terminalNumber}
                  className="mb-3 rounded-[23px] border border-white/90 bg-clay-surface p-5"
                >
                  <View className="flex-row items-center">
                    <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
                      <Route
                        size={19}
                        color={colors.primaryDark}
                        strokeWidth={2.3}
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[13px] font-extrabold text-ink-dark">
                        {terminal.terminalName}
                      </Text>

                      <Text className="mt-0.5 text-[9px] text-ink-muted">
                        Terminal {terminal.terminalNumber}
                      </Text>
                    </View>

                    <Text className="text-[16px] font-extrabold text-ocean-700">
                      {terminal.totalTrips}
                    </Text>
                  </View>

                  <View className="mt-4 h-[9px] overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-full rounded-full bg-ocean-400"
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </View>

                  <View className="mt-4 flex-row justify-between">
                    <Metric
                      label="Trips"
                      value={terminal.totalTrips.toString()}
                    />

                    <Metric
                      label="Passengers"
                      value={terminal.totalPassengers.toLocaleString()}
                    />

                    <Metric
                      label="Active Jeepneys"
                      value={terminal.activeJeepneys.toString()}
                    />
                  </View>
                </View>
              );
            })
          )}

          {/* STAFF */}

          <SectionTitle
            icon={<Users size={18} color={colors.primaryDark} />}
            title="Users & Staff"
            subtitle="Account distribution"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <StaffRow
              label="Drivers"
              value={staffStats.drivers}
              total={staffStats.total}
            />

            <StaffRow
              label="Dispatchers"
              value={staffStats.dispatchers}
              total={staffStats.total}
            />

            <StaffRow
              label="Admins"
              value={staffStats.admins}
              total={staffStats.total}
            />

            <View className="mt-4 flex-row">
              <View className="flex-1 rounded-[16px] bg-ocean-100 p-3">
                <Text className="text-[9px] font-extrabold uppercase text-ocean-700">
                  Active
                </Text>

                <Text className="mt-1 text-[18px] font-extrabold text-ink-dark">
                  {staffStats.active}
                </Text>
              </View>

              <View className="ml-3 flex-1 rounded-[16px] bg-slate-100 p-3">
                <Text className="text-[9px] font-extrabold uppercase text-ink-muted">
                  Inactive
                </Text>

                <Text className="mt-1 text-[18px] font-extrabold text-ink-dark">
                  {staffStats.inactive}
                </Text>
              </View>
            </View>
          </View>

          {/* ACTION GRAPH */}

          <SectionTitle
            icon={<Activity size={18} color={colors.primaryDark} />}
            title="Activity Breakdown"
            subtitle="Most frequent recorded actions"
          />

          {(actionStats ?? []).length === 0 ? (
            <EmptyCard label="No activity actions recorded." />
          ) : (
            <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
              {actionStats.slice(0, 8).map((item) => {
                const width = (item.count / maxActionCount) * 100;

                return (
                  <View key={item.action} className="mb-4 last:mb-0">
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 text-[10px] font-extrabold capitalize text-ink-dark">
                        {item.action.replace(/_/g, " ")}
                      </Text>

                      <Text className="text-[10px] font-extrabold text-ocean-700">
                        {item.count}
                      </Text>
                    </View>

                    <View className="mt-2 h-[8px] overflow-hidden rounded-full bg-slate-100">
                      <View
                        className="h-full rounded-full bg-ocean-400"
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* JEEPNEYS */}

          <SectionTitle
            icon={<BusFront size={18} color={colors.primaryDark} />}
            title="Jeepney Performance"
            subtitle="Highest trip activity"
          />

          {(jeepneyStats ?? []).length === 0 ? (
            <EmptyCard label="No jeepney trip data available." />
          ) : (
            jeepneyStats.slice(0, 5).map((jeepney) => {
              const width = (jeepney.totalTrips / maxJeepneyTrips) * 100;

              return (
                <View
                  key={jeepney.id}
                  className="mb-3 rounded-[23px] border border-white/90 bg-clay-surface p-5"
                >
                  <View className="flex-row items-center">
                    <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                      <BusFront
                        size={18}
                        color={colors.primaryDark}
                        strokeWidth={2.3}
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[12px] font-extrabold text-ink-dark">
                        {jeepney.name}
                      </Text>

                      <Text className="mt-0.5 text-[9px] text-ink-muted">
                        {jeepney.plateNumber}
                      </Text>
                    </View>

                    <Text className="text-[15px] font-extrabold text-ocean-700">
                      {jeepney.totalTrips}
                    </Text>
                  </View>

                  <View className="mt-4 h-[8px] overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-full rounded-full bg-ocean-400"
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </View>

                  <Text className="mt-2 text-[9px] text-ink-muted">
                    {jeepney.totalPassengers.toLocaleString()} passengers ·{" "}
                    {jeepney.averagePassengers.toFixed(1)} avg/trip
                  </Text>
                </View>
              );
            })
          )}

          {/* ACTIVITY LOGS */}

          <SectionTitle
            icon={<Activity size={18} color={colors.primaryDark} />}
            title="Activity Logs"
            subtitle={`${activityLogs.length} recorded activities`}
          />

          {activityLogs.length === 0 ? (
            <EmptyCard label="No activity logs available." />
          ) : (
            activityLogs.slice(0, 15).map((log) => (
              <View
                key={log.id}
                className="mb-3 rounded-[21px] border border-white/90 bg-clay-surface p-4"
              >
                <View className="flex-row">
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
                    <Activity
                      size={16}
                      color={colors.primaryDark}
                      strokeWidth={2.3}
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text
                        numberOfLines={1}
                        className="flex-1 text-[11px] font-extrabold text-ink-dark"
                      >
                        {log.action}
                      </Text>

                      <Text className="ml-2 text-[8px] text-ink-muted">
                        {formatDate(log.created_at)}
                      </Text>
                    </View>

                    <Text className="mt-1 text-[9px] font-semibold text-ocean-700">
                      {log.user_name}
                    </Text>

                    {!!log.description && (
                      <Text
                        numberOfLines={2}
                        className="mt-1 text-[10px] leading-[15px] text-ink-secondary"
                      >
                        {log.description}
                      </Text>
                    )}

                    {!!log.jeepney_plate && (
                      <Text className="mt-1 text-[8px] text-ink-muted">
                        Jeepney: {log.jeepney_plate}
                      </Text>
                    )}

                    {!!log.terminal_id && (
                      <Text className="mt-1 text-[8px] text-ink-muted">
                        Terminal: {log.terminal_id === 1 ? "Donsol" : "Daraga"}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}

          {/* RECENT TRIPS */}

          <SectionTitle
            icon={<Route size={18} color={colors.primaryDark} />}
            title="Recent Trips"
            subtitle={`${trips.length} trips in selected period`}
          />

          {trips.length === 0 ? (
            <EmptyCard label="No trips recorded for this period." />
          ) : (
            trips.slice(0, 10).map((trip) => (
              <View
                key={trip.id}
                className="mb-3 rounded-[22px] border border-white/90 bg-clay-surface p-5"
              >
                <View className="flex-row items-center">
                  <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                    <BusFront
                      size={18}
                      color={colors.primaryDark}
                      strokeWidth={2.3}
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] font-extrabold text-ink-dark">
                      {trip.jeepney_name}
                    </Text>

                    <Text className="mt-0.5 text-[9px] text-ink-muted">
                      {trip.plate_number}
                    </Text>
                  </View>

                  <View className="rounded-full bg-ocean-100 px-3 py-1.5">
                    <Text className="text-[8px] font-extrabold uppercase text-ocean-700">
                      {trip.status}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row">
                  <Metric
                    label="Passengers"
                    value={trip.total_passengers.toString()}
                  />

                  <Metric label="Driver" value={trip.driver_name} />

                  <Metric
                    label="Departure"
                    value={formatDate(trip.departure_time)}
                  />
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

function StaffRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <View className="mb-4 last:mb-0">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-[34px] w-[34px] items-center justify-center rounded-[12px] bg-ocean-100">
            <UserRound size={15} color={colors.primaryDark} strokeWidth={2.3} />
          </View>

          <Text className="ml-3 text-[11px] font-extrabold text-ink-dark">
            {label}
          </Text>
        </View>

        <Text className="text-[11px] font-extrabold text-ocean-700">
          {value}
        </Text>
      </View>

      <View className="mt-2 h-[8px] overflow-hidden rounded-full bg-slate-100">
        <View
          className="h-full rounded-full bg-ocean-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-3 w-[48%] rounded-[22px] border border-white/90 bg-clay-surface p-4">
      <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-0.5 text-[20px] font-extrabold text-ink-dark">
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-3 mt-7 flex-row items-center">
      <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-ocean-100">
        {icon}
      </View>

      <View className="ml-3">
        <Text className="text-[15px] font-extrabold text-ink-dark">
          {title}
        </Text>

        <Text className="mt-0.5 text-[9px] text-ink-muted">{subtitle}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="mr-4 flex-1">
      <Text className="text-[8px] font-extrabold uppercase text-ink-muted">
        {label}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-1 text-[10px] font-extrabold text-ink-dark"
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <View className="items-center rounded-[23px] border border-white/90 bg-clay-surface px-6 py-7">
      <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-ocean-100">
        <XCircle size={21} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <Text className="mt-3 text-center text-[11px] font-extrabold text-ink-secondary">
        {label}
      </Text>
    </View>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
  });
}
