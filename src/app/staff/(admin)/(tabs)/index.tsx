import {
  Activity,
  AlertTriangle,
  BusFront,
  CheckCircle2,
  Clock3,
  MapPin,
  Menu,
  Radio,
  RefreshCw,
  Route,
  Users,
} from "lucide-react-native";

import { useRouter } from "expo-router";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useState } from "react";

import ClayAdminDrawer from "../../../../src/shared/components/clay/ClayAdminDrawer";
import OceanBackground from "../../../../src/shared/components/clay/OceanBackground";

import { colors } from "../../../../src/shared/constants/theme";

import {
  AdminJeepney,
  useAdminDashboard,
} from "../../../../src/shared/hooks/admin/useAdminDashboard";

export default function AdminDashboardScreen() {
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    jeepneys,
    waitingJeepneys,
    loadingJeepney,
    enRouteJeepneys,
    stats,
    loading,
    refreshing,
    error,
    refresh,
  } = useAdminDashboard();

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
            {/* HEADER */}

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

                <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-ocean-100">
                  <Activity
                    size={19}
                    color={colors.primaryDark}
                    strokeWidth={2.4}
                  />
                </View>
              </View>

              <View className="mt-3 flex-row items-center">
                <View className="h-[8px] w-[8px] rounded-full bg-emerald-500" />

                <Text className="ml-2 text-[11px] font-semibold text-ink-secondary">
                  Terminal monitoring active
                </Text>
              </View>
            </View>

            {/* ERROR */}

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

            {/* STAT CARDS */}

            <View className="mt-5">
              <View className="flex-row">
                <View className="flex-1">
                  <ClayStatCard
                    title="Total"
                    value={stats.total}
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
                    title="Waiting"
                    value={stats.waiting}
                    subtitle="In queue"
                    icon={
                      <Clock3 size={19} color="#0369A1" strokeWidth={2.4} />
                    }
                    iconBackground="#DBEAFE"
                  />
                </View>
              </View>

              <View className="mt-3 flex-row">
                <View className="flex-1">
                  <ClayStatCard
                    title="Loading"
                    value={stats.loading}
                    subtitle="At terminal"
                    icon={<Users size={19} color="#B45309" strokeWidth={2.4} />}
                    iconBackground="#FEF3C7"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <ClayStatCard
                    title="En Route"
                    value={stats.enRoute}
                    subtitle="On trip"
                    icon={<Route size={19} color="#4338CA" strokeWidth={2.4} />}
                    iconBackground="#E0E7FF"
                  />
                </View>
              </View>
            </View>

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
                  <CheckCircle2 size={23} color="#059669" strokeWidth={2.3} />
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
                    onPress={() => router.push("/staff/(admin)/(tabs)/queue")}
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

            {/* TERMINAL SUMMARY */}

            <SectionHeader
              title="Terminal Overview"
              subtitle="Fleet status summary"
            />

            <TerminalSummary stats={stats} />
          </ScrollView>

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
      <View className="flex-row items-center justify-between">
        <View
          className="h-[40px] w-[40px] items-center justify-center rounded-[14px]"
          style={{
            backgroundColor: iconBackground,
          }}
        >
          {icon}
        </View>
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
   TERMINAL SUMMARY
============================================================ */

function TerminalSummary({
  stats,
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
}) {
  return (
    <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
      <SummaryRow
        icon={<CheckCircle2 size={17} color="#059669" strokeWidth={2.3} />}
        label="Active fleet"
        value={stats.active}
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
        label="En route"
        value={stats.enRoute}
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
