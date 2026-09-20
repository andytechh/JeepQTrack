import {
  AlertTriangle,
  BusFront,
  CheckCircle2,
  Clock3,
  MapPin,
  Menu,
  Radio,
  RefreshCw,
  Route,
  Users
} from "lucide-react-native";

import { useRouter } from "expo-router";

import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useEffect, useMemo, useState } from "react";

import ClayAdminDrawer from "../../../../src/shared/components/clay/ClayAdminDrawer";
import OceanBackground from "../../../../src/shared/components/clay/OceanBackground";

import { colors } from "../../../../src/shared/constants/theme";

import {
  AdminJeepney,
  useAdminDashboard,
} from "../../../../src/shared/hooks/admin/useAdminDashboard";

import { supabase } from "../../../../src/shared/config/supabase";

/* ============================================================
   TYPES
============================================================ */

type UserRole = "driver" | "dispatcher" | "admin" | "commuter" | string;

interface UserAnalytics {
  total: number;
  commuters: number;
  drivers: number;
  dispatchers: number;
  admins: number;
  active: number;
  inactive: number;
}

type UserAnalyticsPoint = {
  label: string;
  commuters: number;
  drivers: number;
  dispatchers: number;
  admins: number;
};

type JeepneyAnalyticsPoint = {
  label: string;
  trips: number;
  passengers: number;
  activeJeepneys: number;
};

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_COLORS = {
  waiting: "#0284C7",
  loading: "#D97706",
  enRoute: "#4F46E5",
  arrived: "#0891B2",
  dispatched: "#7C3AED",
  inactive: "#64748B",
};

const ROLE_COLORS = {
  commuters: "#0284C7",
  drivers: "#059669",
  dispatchers: "#D97706",
  admins: "#7C3AED",
};

/* ============================================================
   MAIN DASHBOARD
============================================================ */

export default function AdminDashboardScreen() {
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics>({
    total: 0,
    commuters: 0,
    drivers: 0,
    dispatchers: 0,
    admins: 0,
    active: 0,
    inactive: 0,
  });

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [userAnalyticsHistory, setUserAnalyticsHistory] = useState<
    UserAnalyticsPoint[]
  >([]);
  const [jeepneyAnalyticsHistory, setJeepneyAnalyticsHistory] = useState<
    JeepneyAnalyticsPoint[]
  >([]);

  const {
    jeepneys,
    waitingJeepneys,
    loadingJeepney,
    enRouteJeepneys,
    loading,
    refreshing,
    error,
    refresh,
    isOperatingHours,
    operatingHoursMessage,
  } = useAdminDashboard();

  /* ==========================================================
     LOAD DASHBOARD ANALYTICS

     Users use actual users.created_at timestamps and show NEW
     registrations per day.

     Jeepney analytics use actual trips.departure_time data and
     calculate daily trip count, passenger count, and the number
     of unique jeepneys that operated that day.

     These are daily values, not cumulative totals, so the area
     charts can naturally move both upward and downward.
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);

        const firstDay = new Date();
        firstDay.setHours(0, 0, 0, 0);
        firstDay.setDate(firstDay.getDate() - 6);

        const [usersResult, tripsResult] = await Promise.all([
          supabase
            .from("users")
            .select("role, is_active, created_at")
            .order("created_at", { ascending: true }),
          supabase
            .from("trips")
            .select("jeepney_id, departure_time, total_passengers")
            .gte("departure_time", firstDay.toISOString())
            .order("departure_time", { ascending: true }),
        ]);

        if (!mounted) return;

        if (usersResult.error) {
          console.error(
            "❌ Admin dashboard users query failed:",
            usersResult.error,
          );
        }

        if (tripsResult.error) {
          console.error(
            "❌ Admin dashboard trips query failed:",
            tripsResult.error,
          );
        }

        const users = usersResult.data ?? [];
        const trips = tripsResult.data ?? [];

        const commuters = users.filter(
          (user) => user.role === "commuter",
        ).length;
        const drivers = users.filter((user) => user.role === "driver").length;
        const dispatchers = users.filter(
          (user) => user.role === "dispatcher",
        ).length;
        const admins = users.filter((user) => user.role === "admin").length;
        const active = users.filter((user) => user.is_active === true).length;
        const inactive = users.filter((user) => user.is_active !== true).length;

        setUserAnalytics({
          total: users.length,
          commuters,
          drivers,
          dispatchers,
          admins,
          active,
          inactive,
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days = Array.from({ length: 7 }, (_, index) => {
          const day = new Date(today);
          day.setDate(today.getDate() - (6 - index));
          return day;
        });

        const userHistory: UserAnalyticsPoint[] = days.map((day) => {
          const start = new Date(day);
          start.setHours(0, 0, 0, 0);

          const end = new Date(day);
          end.setHours(23, 59, 59, 999);

          const registered = users.filter((user) => {
            if (!user.created_at) return false;
            const created = new Date(user.created_at);
            return created >= start && created <= end;
          });

          return {
            label: day.toLocaleDateString("en-US", { weekday: "short" }),
            commuters: registered.filter((user) => user.role === "commuter")
              .length,
            drivers: registered.filter((user) => user.role === "driver").length,
            dispatchers: registered.filter((user) => user.role === "dispatcher")
              .length,
            admins: registered.filter((user) => user.role === "admin").length,
          };
        });

        const jeepneyHistory: JeepneyAnalyticsPoint[] = days.map((day) => {
          const start = new Date(day);
          start.setHours(0, 0, 0, 0);

          const end = new Date(day);
          end.setHours(23, 59, 59, 999);

          const dailyTrips = trips.filter((trip) => {
            if (!trip.departure_time) return false;
            const departure = new Date(trip.departure_time);
            return departure >= start && departure <= end;
          });

          const activeJeepneys = new Set(
            dailyTrips
              .map((trip) => trip.jeepney_id)
              .filter((id): id is string => Boolean(id)),
          ).size;

          const passengers = dailyTrips.reduce(
            (sum, trip) => sum + Number(trip.total_passengers ?? 0),
            0,
          );

          return {
            label: day.toLocaleDateString("en-US", { weekday: "short" }),
            trips: dailyTrips.length,
            passengers,
            activeJeepneys,
          };
        });

        setUserAnalyticsHistory(userHistory);
        setJeepneyAnalyticsHistory(jeepneyHistory);
      } catch (err) {
        console.error("❌ Admin dashboard analytics error:", err);
      } finally {
        if (mounted) setAnalyticsLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     JEEPNEY OVERVIEW

     Outside operating hours ALL jeepneys are treated as
     inactive for dashboard purposes.

     This does NOT modify the Supabase records.
  ========================================================== */

  const jeepneyOverview = useMemo(() => {
    const total = jeepneys.length;

    if (!isOperatingHours) {
      return {
        total,
        active: 0,
        waiting: 0,
        loading: 0,
        enRoute: 0,
        arrived: 0,
        dispatched: 0,
        inactive: total,
      };
    }

    const waiting = jeepneys.filter(
      (jeepney) => jeepney.status === "waiting",
    ).length;

    const loading = jeepneys.filter(
      (jeepney) => jeepney.status === "loading",
    ).length;

    const enRoute = jeepneys.filter(
      (jeepney) => jeepney.status === "en_route",
    ).length;

    const arrived = jeepneys.filter(
      (jeepney) => jeepney.status === "arrived",
    ).length;

    const dispatched = jeepneys.filter(
      (jeepney) => jeepney.status === "dispatched",
    ).length;

    const active = waiting + loading + enRoute + arrived + dispatched;

    const inactive = Math.max(0, total - active);

    return {
      total,
      active,
      waiting,
      loading,
      enRoute,
      arrived,
      dispatched,
      inactive,
    };
  }, [jeepneys, isOperatingHours]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <OceanBackground intensity={0.25}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-bold text-ink-dark">
              Loading dashboard...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Getting the latest terminal status
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /* ==========================================================
     SCREEN
  ========================================================== */

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <View className="flex-1">
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
              paddingBottom: 130,
            }}
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <View className="pt-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setDrawerOpen(true)}
                    className="h-[50px] w-[50px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface shadow-clay-sm"
                  >
                    <Menu
                      size={23}
                      color={colors.primaryDark}
                      strokeWidth={2.4}
                    />
                  </Pressable>

                  <View className="ml-3">
                    <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-ocean-700">
                      SMART QUEUE
                    </Text>

                    <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                      Admin Dashboard
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row items-center">
                <View
                  className={`h-[8px] w-[8px] rounded-full ${
                    isOperatingHours ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />

                <Text className="ml-2 text-[11px] font-semibold text-ink-secondary">
                  {isOperatingHours
                    ? "Terminal monitoring active"
                    : "Terminal service closed"}
                </Text>
              </View>
            </View>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
                <View className="flex-row items-center">
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-red-50">
                    <AlertTriangle
                      size={21}
                      color="#DC2626"
                      strokeWidth={2.4}
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-extrabold text-ink-dark">
                      Dashboard data unavailable
                    </Text>

                    <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                      {error}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={refresh}
                  className="mt-4 h-[44px] flex-row items-center justify-center rounded-full bg-ocean-400"
                >
                  <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />

                  <Text className="ml-2 text-[12px] font-extrabold text-white">
                    Retry
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ==================================================
                TOP STAT CARDS
            ================================================== */}

            <View className="mt-5">
              <View className="flex-row">
                <View className="flex-1">
                  <ClayStatCard
                    title="Total"
                    value={jeepneyOverview.total}
                    subtitle="Jeepneys"
                    icon={
                      <BusFront
                        size={19}
                        color={colors.primaryDark}
                        strokeWidth={2.4}
                      />
                    }
                    iconBackground="#E0F2FE"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <ClayStatCard
                    title="Active"
                    value={jeepneyOverview.active}
                    subtitle="Fleet today"
                    icon={
                      <CheckCircle2
                        size={19}
                        color="#059669"
                        strokeWidth={2.4}
                      />
                    }
                    iconBackground="#D1FAE5"
                  />
                </View>
              </View>

              <View className="mt-3 flex-row">
                <View className="flex-1">
                  <ClayStatCard
                    title="Waiting"
                    value={jeepneyOverview.waiting}
                    subtitle="In queue"
                    icon={
                      <Clock3 size={19} color="#0369A1" strokeWidth={2.4} />
                    }
                    iconBackground="#DBEAFE"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <ClayStatCard
                    title="En Route"
                    value={jeepneyOverview.enRoute}
                    subtitle="On trip"
                    icon={<Route size={19} color="#4338CA" strokeWidth={2.4} />}
                    iconBackground="#E0E7FF"
                  />
                </View>
              </View>
            </View>

            {/* ==================================================
                SERVICE CLOSED
            ================================================== */}

            {!isOperatingHours && (
              <View className="mt-6 rounded-[25px] border border-white/90 bg-clay-surface p-5">
                <View className="flex-row items-center">
                  <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-slate-100">
                    <Clock3 size={23} color="#64748B" strokeWidth={2.3} />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-extrabold text-ink-dark">
                      Service has ended for today
                    </Text>

                    <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                      {operatingHoursMessage ||
                        "Jeepney operations are currently closed. Please come back tomorrow."}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ==================================================
                LIVE OPERATIONS
            ================================================== */}

            {isOperatingHours && (
              <>
                {/* CURRENT LOADING */}

                <SectionHeader
                  title="Current Loading"
                  subtitle="Jeepney being prepared for departure"
                />

                {loadingJeepney ? (
                  <LoadingJeepneyCard jeepney={loadingJeepney} />
                ) : (
                  <EmptyCard
                    icon={
                      <BusFront
                        size={23}
                        color={colors.primaryDark}
                        strokeWidth={2.3}
                      />
                    }
                    title="No jeepney is loading"
                    message="There is currently no jeepney in the loading state."
                  />
                )}

                {/* QUEUE */}

                <SectionHeader
                  title="Jeepney Queue"
                  subtitle="Based on jeepney queue position"
                  count={waitingJeepneys.length}
                />

                {waitingJeepneys.length === 0 ? (
                  <EmptyCard
                    icon={
                      <CheckCircle2
                        size={23}
                        color="#059669"
                        strokeWidth={2.3}
                      />
                    }
                    title="Queue is clear"
                    message="There are no jeepneys currently waiting in the queue."
                  />
                ) : (
                  <View>
                    {waitingJeepneys.slice(0, 5).map((jeepney, index) => (
                      <QueueJeepneyCard
                        key={jeepney.id}
                        jeepney={jeepney}
                        index={index}
                      />
                    ))}

                    {waitingJeepneys.length > 5 && (
                      <Pressable
                        onPress={() =>
                          router.push("/staff/(admin)/(tabs)/queue")
                        }
                        className="mt-2 h-[46px] items-center justify-center rounded-full bg-white/80"
                      >
                        <Text className="text-[12px] font-extrabold text-ocean-700">
                          View all {waitingJeepneys.length} jeepneys
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* EN ROUTE */}

                <SectionHeader
                  title="Currently En Route"
                  subtitle="Jeepneys outside the terminal"
                  count={enRouteJeepneys.length}
                />

                {enRouteJeepneys.length === 0 ? (
                  <EmptyCard
                    icon={
                      <MapPin
                        size={23}
                        color={colors.primaryDark}
                        strokeWidth={2.3}
                      />
                    }
                    title="No active trips"
                    message="No jeepney is currently marked as en route."
                  />
                ) : (
                  <View>
                    {enRouteJeepneys.slice(0, 4).map((jeepney) => (
                      <EnRouteCard key={jeepney.id} jeepney={jeepney} />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ==================================================
                JEEPNEY OVERVIEW
            ================================================== */}

            <SectionHeader
              title="Jeepney Overview"
              subtitle={
                isOperatingHours
                  ? "Current fleet status"
                  : "All fleet is inactive after service hours"
              }
            />

            <JeepneyOverview
              stats={jeepneyOverview}
              isOperatingHours={isOperatingHours}
            />

            {/* ==================================================
                DASHBOARD ANALYTICS

                Jeepney Fleet graph removed because the same
                information is already shown above.
            ================================================== */}

            <SectionHeader
              title="Dashboard Analytics"
              subtitle="Users and jeepney operating statistics"
            />

            {/* USERS GRAPH */}

            <ApexAreaChart
              title="Users"
              subtitle="New registrations over the last 7 days"
              total={userAnalytics.total}
              history={userAnalyticsHistory}
              series={[
                { name: "Commuters", key: "commuters", color: "#0284C7" },
                { name: "Drivers", key: "drivers", color: "#059669" },
                { name: "Dispatchers", key: "dispatchers", color: "#D97706" },
                { name: "Admins", key: "admins", color: "#7C3AED" },
              ]}
              unit="registrations"
              loading={analyticsLoading}
            />

            {/* JEEPNEY STATS GRAPH */}

            <View className="mt-4">
              <ApexAreaChart
                title="Jeepney Stats"
                subtitle="Daily trips, passengers, and operating jeepneys"
                total={jeepneys.length}
                history={jeepneyAnalyticsHistory}
                series={[
                  { name: "Trips", key: "trips", color: "#0284C7" },
                  { name: "Passengers", key: "passengers", color: "#059669" },
                  { name: "Jeepneys", key: "activeJeepneys", color: "#D97706" },
                ]}
                unit="count"
                loading={analyticsLoading}
              />
            </View>
          </ScrollView>

          {/* ====================================================
              ADMIN DRAWER
          ==================================================== */}

          <ClayAdminDrawer
            visible={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onNavigate={(route) => {
              setDrawerOpen(false);
              router.push(route as any);
            }}
          />
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ============================================================
   CLAY STAT CARD
============================================================ */

function ClayStatCard({
  title,
  value,
  subtitle,
  icon,
  iconBackground,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  iconBackground: string;
}) {
  return (
    <View
      className="rounded-[23px] border border-white/90 bg-clay-surface p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.055,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      <View
        className="h-[40px] w-[40px] items-center justify-center rounded-[14px]"
        style={{
          backgroundColor: iconBackground,
        }}
      >
        {icon}
      </View>

      <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.8px] text-ink-muted">
        {title}
      </Text>

      <Text className="mt-0.5 text-[27px] font-extrabold text-ink-dark">
        {value}
      </Text>

      <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
        {subtitle}
      </Text>
    </View>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count?: number;
}) {
  return (
    <View className="mb-3 mt-7 flex-row items-end justify-between">
      <View className="flex-1">
        <Text className="text-[16px] font-extrabold text-ink-dark">
          {title}
        </Text>

        <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
          {subtitle}
        </Text>
      </View>

      {count !== undefined && (
        <View className="rounded-full bg-ocean-100 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold text-ocean-700">
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ============================================================
   APEXCHARTS AREA CHART

   ApexCharts is rendered inside react-native-webview because
   ApexCharts uses browser DOM APIs. Data is passed as JSON.
============================================================ */

type ApexSeries = {
  name: string;
  key: string;
  color: string;
};

function ApexAreaChart({
  title,
  subtitle,
  total,
  history,
  series,
  loading,
  unit,
}: {
  title: string;
  subtitle: string;
  total: number;
  history: Array<Record<string, any>>;
  series: ApexSeries[];
  loading: boolean;
  unit: string;
}) {
  const chartWidth = Math.max(300, Dimensions.get("window").width - 70);

  const html = useMemo(() => {
    const categories = history.map((point) => point.label);
    const apexSeries = series.map((item) => ({
      name: item.name,
      data: history.map((point) => Number(point[item.key] ?? 0)),
    }));
    const chartColors = JSON.stringify(series.map((item) => item.color));
    const tooltipUnit = JSON.stringify(unit);

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }
  #chart {
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>
<div id="chart"></div>
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
<script>
  const options = {
    chart: {
      type: "area",
      height: 270,
      width: "100%",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 750,
        animateGradually: { enabled: true, delay: 120 },
        dynamicAnimation: { enabled: true, speed: 350 }
      },
      parentHeightOffset: 0,
      foreColor: "#64748B"
    },
    series: ${JSON.stringify(apexSeries)},
    colors: ${chartColors},
    stroke: {
      curve: "smooth",
      width: 3
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.38,
        opacityTo: 0.05,
        stops: [0, 88, 100]
      }
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      hover: { size: 6 }
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#E2E8F0",
      strokeDashArray: 4,
      padding: { top: 6, right: 8, bottom: 0, left: 4 }
    },
    xaxis: {
      categories: ${JSON.stringify(categories)},
      labels: {
        style: {
          colors: "#64748B",
          fontSize: "10px",
          fontFamily: "Arial, sans-serif",
          fontWeight: 600
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: {
          colors: "#64748B",
          fontSize: "10px",
          fontFamily: "Arial, sans-serif"
        },
        formatter: function(value) { return Math.round(value); }
      }
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "left",
      fontSize: "10px",
      fontFamily: "Arial, sans-serif",
      fontWeight: 600,
      markers: { width: 7, height: 7, radius: 7 },
      itemMargin: { horizontal: 7, vertical: 3 }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: "light",
      x: { show: true },
      y: { formatter: function(value) { return Math.round(value) + " " + ${tooltipUnit}; } }
    },
    noData: {
      text: "No analytics data available",
      align: "center",
      verticalAlign: "middle",
      style: { color: "#64748B", fontSize: "11px" }
    }
  };

  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();
</script>
</body>
</html>`;
  }, [history, series, unit]);

  return (
    <View
      className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.045,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[15px] font-extrabold text-ink-dark">
            {title}
          </Text>
          <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
            {subtitle}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[21px] font-extrabold text-ink-dark">
            {total}
          </Text>
          <Text className="text-[9px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
            Total
          </Text>
        </View>
      </View>

      <View className="mt-4 overflow-hidden rounded-[18px] bg-white/60">
        {loading ? (
          <View className="h-[270px] items-center justify-center">
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text className="mt-2 text-[10px] font-medium text-ink-muted">
              Loading analytics...
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            style={{
              width: chartWidth,
              height: 270,
              backgroundColor: "transparent",
            }}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            automaticallyAdjustContentInsets={false}
          />
        )}
      </View>
    </View>
  );
}

/* ============================================================
   LOADING JEEPNEY
============================================================ */

function LoadingJeepneyCard({ jeepney }: { jeepney: AdminJeepney }) {
  const capacity = jeepney.capacity || 1;

  const occupancy = Math.min(
    100,
    Math.round((jeepney.current_occupancy / capacity) * 100),
  );

  return (
    <View
      className="rounded-[26px] border border-white/90 bg-white/90 p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center">
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-amber-100">
          <BusFront size={25} color="#B45309" strokeWidth={2.2} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-extrabold text-ink-dark">
            {jeepney.jeep_name || jeepney.plate_number || "Unnamed Jeepney"}
          </Text>

          <Text className="mt-0.5 text-[11px] font-medium text-ink-secondary">
            {jeepney.plate_number || "No plate number"}
          </Text>
        </View>

        <View className="rounded-full bg-amber-100 px-3 py-1.5">
          <Text className="text-[9px] font-extrabold uppercase text-amber-700">
            Loading
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row">
        <View className="flex-1">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] text-ink-muted">
            Driver
          </Text>

          <Text className="mt-1 text-[12px] font-bold text-ink-dark">
            {jeepney.driver_name || "Unassigned"}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.6px] text-ink-muted">
            Bracket
          </Text>

          <Text className="mt-1 text-[12px] font-bold text-ink-dark">
            {jeepney.bracket || "—"}
          </Text>
        </View>
      </View>

      <View className="mt-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Occupancy
          </Text>

          <Text className="text-[11px] font-extrabold text-ink-dark">
            {jeepney.current_occupancy} / {jeepney.capacity}
          </Text>
        </View>

        <View className="mt-2 h-[9px] overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-ocean-400"
            style={{
              width: `${occupancy}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   QUEUE CARD
============================================================ */

function QueueJeepneyCard({
  jeepney,
  index,
}: {
  jeepney: AdminJeepney;
  index: number;
}) {
  const position = jeepney.queue_position ?? index + 1;

  return (
    <View
      className="mb-3 rounded-[23px] border border-white/90 bg-clay-surface p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center">
        <View className="h-[43px] w-[43px] items-center justify-center rounded-[14px] bg-ocean-400">
          <Text className="text-[16px] font-extrabold text-white">
            {position}
          </Text>
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[13px] font-extrabold text-ink-dark"
          >
            {jeepney.jeep_name || jeepney.plate_number || "Unnamed Jeepney"}
          </Text>

          <Text className="mt-0.5 text-[10px] font-medium text-ink-secondary">
            {jeepney.plate_number}
          </Text>
        </View>

        <View className="items-end">
          <View className="flex-row items-center">
            <Users size={13} color={colors.primaryDark} strokeWidth={2.3} />

            <Text className="ml-1 text-[11px] font-extrabold text-ink-dark">
              {jeepney.current_occupancy}/{jeepney.capacity}
            </Text>
          </View>

          <Text className="mt-1 text-[9px] font-medium text-ink-muted">
            {jeepney.driver_name || "No driver"}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   EN ROUTE CARD
============================================================ */

function EnRouteCard({ jeepney }: { jeepney: AdminJeepney }) {
  return (
    <View className="mb-3 flex-row items-center rounded-[22px] border border-white/90 bg-clay-surface p-4">
      <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-indigo-100">
        <Route size={21} color="#4338CA" strokeWidth={2.3} />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[13px] font-extrabold text-ink-dark">
          {jeepney.jeep_name || jeepney.plate_number}
        </Text>

        <Text className="mt-0.5 text-[10px] text-ink-secondary">
          {jeepney.plate_number}
        </Text>
      </View>

      <View className="items-end">
        <View className="flex-row items-center">
          <Radio size={13} color="#4F46E5" strokeWidth={2.3} />

          <Text className="ml-1 text-[10px] font-extrabold text-indigo-700">
            EN ROUTE
          </Text>
        </View>

        {jeepney.eta !== null && (
          <Text className="mt-1 text-[9px] font-medium text-ink-muted">
            ETA {jeepney.eta} min
          </Text>
        )}
      </View>
    </View>
  );
}

/* ============================================================
   EMPTY CARD
============================================================ */

function EmptyCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <View className="items-center rounded-[25px] border border-white/90 bg-white/70 px-6 py-7">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        {title}
      </Text>

      <Text className="mt-1 max-w-[280px] text-center text-[10px] leading-[16px] text-ink-secondary">
        {message}
      </Text>
    </View>
  );
}

/* ============================================================
   JEEPNEY OVERVIEW
============================================================ */

function JeepneyOverview({
  stats,
  isOperatingHours,
}: {
  stats: {
    total: number;
    active: number;
    waiting: number;
    loading: number;
    enRoute: number;
    arrived: number;
    dispatched: number;
    inactive: number;
  };
  isOperatingHours: boolean;
}) {
  return (
    <View
      className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.045,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      {/* ACTIVE FLEET TODAY */}

      <View className="mb-1 rounded-[18px] bg-ocean-50 px-4 py-3">
        <View className="flex-row items-center">
          <View className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-emerald-100">
            <CheckCircle2 size={19} color="#059669" strokeWidth={2.4} />
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-[0.5px] text-ink-muted">
              Active Fleet Today
            </Text>

            <Text className="mt-0.5 text-[10px] font-medium text-ink-secondary">
              {isOperatingHours
                ? "Jeepneys currently participating in service"
                : "No active fleet after service hours"}
            </Text>
          </View>

          <Text className="text-[22px] font-extrabold text-ink-dark">
            {stats.active}
          </Text>
        </View>
      </View>

      <SummaryRow
        icon={
          <BusFront size={17} color={colors.primaryDark} strokeWidth={2.3} />
        }
        label="Total Jeepneys"
        value={stats.total}
      />

      <SummaryRow
        icon={<Clock3 size={17} color="#0284C7" strokeWidth={2.3} />}
        label="Waiting"
        value={stats.waiting}
      />

      <SummaryRow
        icon={<Users size={17} color="#B45309" strokeWidth={2.3} />}
        label="Loading"
        value={stats.loading}
      />

      <SummaryRow
        icon={<Route size={17} color="#4338CA" strokeWidth={2.3} />}
        label="En Route"
        value={stats.enRoute}
      />

      <SummaryRow
        icon={<MapPin size={17} color="#0891B2" strokeWidth={2.3} />}
        label="Arrived"
        value={stats.arrived}
      />

      <SummaryRow
        icon={<Radio size={17} color="#7C3AED" strokeWidth={2.3} />}
        label="Dispatched"
        value={stats.dispatched}
      />

      <SummaryRow
        icon={<BusFront size={17} color="#64748B" strokeWidth={2.3} />}
        label="Inactive"
        value={stats.inactive}
        last
      />
    </View>
  );
}

/* ============================================================
   SUMMARY ROW
============================================================ */

function SummaryRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3 ${
        !last ? "border-b border-slate-100" : ""
      }`}
    >
      <View className="h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-white">
        {icon}
      </View>

      <Text className="ml-3 flex-1 text-[11px] font-semibold text-ink-secondary">
        {label}
      </Text>

      <Text className="text-[13px] font-extrabold text-ink-dark">{value}</Text>
    </View>
  );
}
