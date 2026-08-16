import {
  Activity,
  AlertCircle,
  BusFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "../../../../src/shared/components/clay/OceanBackground";
import { colors } from "../../../../src/shared/constants/theme";
import {
  AdminQueueJeepney,
  QueueTerminal,
  useAdminQueue,
} from "../../../../src/shared/hooks/admin/useAdminQueue";

export default function AdminQueueScreen() {
  const {
    loadingJeepney,
    waitingJeepneys,
    enRouteJeepneys,
    arrivedJeepneys,
    totalWaiting,
    terminal,
    setTerminal,
    loading,
    refreshing,
    error,
    refresh,
  } = useAdminQueue();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <OceanBackground intensity={0.32}>
      <SafeAreaView className="flex-1">
        <View className="flex-1">
          <Header totalWaiting={totalWaiting} loading={loadingJeepney} />

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 130,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.primaryDark}
              />
            }
          >
            <TerminalSelector value={terminal} onChange={setTerminal} />

            {error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : (
              <>
                <QueueSummary
                  loading={loadingJeepney}
                  waiting={totalWaiting}
                  enRoute={enRouteJeepneys.length}
                />

                <CurrentLoadingCard jeepney={loadingJeepney} />

                <WaitingQueueSection jeepneys={waitingJeepneys} />

                <EnRouteSection jeepneys={enRouteJeepneys} />

                <ArrivedSection jeepneys={arrivedJeepneys} />
              </>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}

/*
 * ============================================================
 * HEADER
 * ============================================================
 */

function Header({
  totalWaiting,
  loading,
}: {
  totalWaiting: number;
  loading: AdminQueueJeepney | null;
}) {
  return (
    <View className="px-6 pb-3 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {/* <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface shadow-clay-sm">
            <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-ocean-100">
              <BusFront
                size={21}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </View>
          </View> */}

          <View className="">
            <Text className="text-[11px] font-bold uppercase tracking-[1.4px] text-ocean-700">
              Operations
            </Text>

            <Text className="mt-0.5 text-[24px] font-extrabold text-ink-dark">
              Queue Management
            </Text>
          </View>
        </View>

        <View className="items-end">
          <View className="min-w-[34px] items-center rounded-full bg-ocean-400 px-2.5 py-1.5">
            <Text className="text-[11px] font-extrabold text-white">
              {totalWaiting}
            </Text>
          </View>

          <Text className="mt-1 text-[9px] font-semibold text-ink-muted">
            waiting
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <Radio size={13} color={colors.primaryDark} strokeWidth={2.5} />

        <Text className="ml-1.5 text-[11px] font-semibold text-ink-secondary">
          Live queue status
        </Text>

        <View className="ml-2 h-[6px] w-[6px] rounded-full bg-emerald-400" />
      </View>

      <View className="mt-3 h-px bg-white/70" />
    </View>
  );
}

/*
 * ============================================================
 * TERMINAL SELECTOR
 * ============================================================
 */

function TerminalSelector({
  value,
  onChange,
}: {
  value: QueueTerminal;
  onChange: (value: QueueTerminal) => void;
}) {
  return (
    <View className="mt-2">
      <View className="mb-2 flex-row items-center">
        <MapPin size={14} color={colors.primaryDark} strokeWidth={2.3} />

        <Text className="ml-1.5 text-[11px] font-extrabold uppercase tracking-[0.8px] text-ocean-700">
          Terminal
        </Text>
      </View>

      <View className="flex-row rounded-[20px] border border-white/90 bg-white/60 p-1.5 shadow-clay-sm">
        <TerminalButton
          label="All"
          active={value === "all"}
          onPress={() => onChange("all")}
        />

        <TerminalButton
          label="Donsol"
          active={value === 1}
          onPress={() => onChange(1)}
        />

        <TerminalButton
          label="Daraga"
          active={value === 2}
          onPress={() => onChange(2)}
        />
      </View>
    </View>
  );
}

function TerminalButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center justify-center rounded-[15px] px-3 py-2.5 ${
        active ? "bg-ocean-400" : "bg-transparent"
      }`}
    >
      <Text
        className={`text-[11px] font-extrabold ${
          active ? "text-white" : "text-ink-secondary"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

function QueueSummary({
  loading,
  waiting,
  enRoute,
}: {
  loading: AdminQueueJeepney | null;
  waiting: number;
  enRoute: number;
}) {
  return (
    <View className="mt-4 flex-row">
      <SummaryCard
        icon={<Activity size={18} color={colors.primaryDark} />}
        value={loading ? "1" : "0"}
        label="Loading"
      />

      <View className="w-2" />

      <SummaryCard
        icon={<Clock3 size={18} color={colors.primaryDark} />}
        value={String(waiting)}
        label="Waiting"
      />

      <View className="w-2" />

      <SummaryCard
        icon={<Radio size={18} color={colors.primaryDark} />}
        value={String(enRoute)}
        label="En route"
      />
    </View>
  );
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 rounded-[20px] border border-white/90 bg-clay-surface/90 p-3 shadow-clay-sm">
      <View className="h-[32px] w-[32px] items-center justify-center rounded-full bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-2 text-[20px] font-extrabold text-ink-dark">
        {value}
      </Text>

      <Text className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * CURRENT LOADING
 * ============================================================
 */

function CurrentLoadingCard({
  jeepney,
}: {
  jeepney: AdminQueueJeepney | null;
}) {
  return (
    <View className="mt-5">
      <SectionTitle title="Now Loading" subtitle="Queue position 1" />

      {!jeepney ? (
        <View className="mt-3 items-center rounded-[26px] border border-white/90 bg-white/70 px-6 py-8">
          <View className="h-[54px] w-[54px] items-center justify-center rounded-full bg-ocean-100">
            <BusFront size={23} color={colors.primaryDark} strokeWidth={2.2} />
          </View>

          <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
            No jeepney is loading
          </Text>

          <Text className="mt-1 text-center text-[11px] text-ink-secondary">
            The next jeepney will appear here when loading starts.
          </Text>
        </View>
      ) : (
        <View className="mt-3 rounded-[26px] border border-ocean-200 bg-white p-4 shadow-clay">
          <View className="flex-row items-center">
            <View className="h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-ocean-100">
              <BusFront
                size={25}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            </View>

            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <View className="rounded-full bg-ocean-400 px-2.5 py-1">
                  <Text className="text-[9px] font-extrabold text-white">
                    #1
                  </Text>
                </View>

                <Text className="ml-2 text-[15px] font-extrabold text-ink-dark">
                  {jeepney.jeep_name || jeepney.plate_number}
                </Text>
              </View>

              <Text className="mt-1 text-[11px] font-medium text-ink-secondary">
                {jeepney.plate_number}
              </Text>
            </View>

            <View className="items-end">
              <View className="flex-row items-center rounded-full bg-emerald-50 px-2.5 py-1.5">
                <View className="h-[6px] w-[6px] rounded-full bg-emerald-500" />

                <Text className="ml-1.5 text-[9px] font-extrabold text-emerald-700">
                  LOADING
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row rounded-[18px] bg-slate-50 p-3">
            <InfoItem
              label="Driver"
              value={jeepney.driver_name || "Unassigned"}
            />

            <InfoItem
              label="Passengers"
              value={`${jeepney.current_occupancy ?? 0}/${jeepney.capacity ?? 0}`}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/*
 * ============================================================
 * WAITING QUEUE
 * ============================================================
 */

function WaitingQueueSection({ jeepneys }: { jeepneys: AdminQueueJeepney[] }) {
  return (
    <View className="mt-6">
      <SectionTitle
        title="Waiting Queue"
        subtitle="Ordered by queue position"
      />

      {jeepneys.length === 0 ? (
        <EmptySection message="No jeepneys are currently waiting." />
      ) : (
        <View className="mt-3">
          {jeepneys.map((jeepney, index) => (
            <QueueCard
              key={jeepney.id}
              jeepney={jeepney}
              fallbackPosition={index + 2}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function QueueCard({
  jeepney,
  fallbackPosition,
}: {
  jeepney: AdminQueueJeepney;
  fallbackPosition: number;
}) {
  const position = jeepney.queue_position ?? fallbackPosition;

  const occupancy = jeepney.current_occupancy ?? 0;
  const capacity = jeepney.capacity ?? 0;

  const occupancyPercent = capacity > 0 ? Math.min(occupancy / capacity, 1) : 0;

  return (
    <View className="mb-3 rounded-[24px] border border-white/90 bg-clay-surface/90 p-4 shadow-clay-sm">
      <View className="flex-row items-center">
        <View className="h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-ocean-100">
          <Text className="text-[15px] font-extrabold text-ocean-700">
            #{position}
          </Text>
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-ink-dark"
          >
            {jeepney.jeep_name || jeepney.plate_number}
          </Text>

          <Text className="mt-1 text-[10px] font-medium text-ink-secondary">
            {jeepney.plate_number}
          </Text>
        </View>

        <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
      </View>

      <View className="mt-3 h-px bg-slate-200/70" />

      <View className="mt-3 flex-row">
        <SmallInfo
          icon={<Users size={13} color={colors.primaryDark} />}
          label="Occupancy"
          value={`${occupancy}/${capacity}`}
        />

        <SmallInfo
          icon={<MapPin size={13} color={colors.primaryDark} />}
          label="Terminal"
          value={
            jeepney.terminal_id === 1
              ? "Donsol"
              : jeepney.terminal_id === 2
                ? "Daraga"
                : "Unknown"
          }
        />

        <SmallInfo
          icon={<BusFront size={13} color={colors.primaryDark} />}
          label="Driver"
          value={jeepney.driver_name || "Unassigned"}
        />
      </View>

      <View className="mt-3">
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
            Occupancy
          </Text>

          <Text className="text-[9px] font-extrabold text-ocean-700">
            {Math.round(occupancyPercent * 100)}%
          </Text>
        </View>

        <View className="h-[7px] overflow-hidden rounded-full bg-slate-200">
          <View
            className="h-full rounded-full bg-ocean-400"
            style={{
              width: `${occupancyPercent * 100}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * EN ROUTE
 * ============================================================
 */

function EnRouteSection({ jeepneys }: { jeepneys: AdminQueueJeepney[] }) {
  return (
    <View className="mt-3">
      <SectionTitle title="En Route" subtitle="Dispatched jeepneys" />

      {jeepneys.length === 0 ? (
        <EmptySection message="No jeepneys are currently en route." />
      ) : (
        <View className="mt-3">
          {jeepneys.map((jeepney) => (
            <EnRouteCard key={jeepney.id} jeepney={jeepney} />
          ))}
        </View>
      )}
    </View>
  );
}

function EnRouteCard({ jeepney }: { jeepney: AdminQueueJeepney }) {
  const formatEta = (minutes: number | null) => {
    if (minutes === null || !Number.isFinite(minutes)) {
      return null;
    }

    const roundedMinutes = Math.max(0, Math.round(minutes));

    if (roundedMinutes === 0) {
      return {
        value: "Arriving",
        unit: "",
      };
    }

    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return {
        value: `${hours} hr${hours > 1 ? "s" : ""} ${remainingMinutes}`,
        unit: "min",
      };
    }

    if (hours > 0) {
      return {
        value: `${hours} hr${hours > 1 ? "s" : ""}`,
        unit: "",
      };
    }

    return {
      value: `${remainingMinutes}`,
      unit: "min",
    };
  };

  const formattedEta = formatEta(jeepney.eta);

  return (
    <View className="mb-3 rounded-[22px] border border-white/90 bg-white/70 p-4">
      <View className="flex-row items-center">
        <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-indigo-50">
          <Radio size={20} color="#4F46E5" strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[13px] font-extrabold text-ink-dark">
            {jeepney.jeep_name || jeepney.plate_number}
          </Text>

          <Text className="mt-1 text-[10px] text-ink-secondary">
            {jeepney.plate_number}
          </Text>
        </View>

        <View className="items-end">
          {formattedEta ? (
            <>
              <Text
                className={`text-[17px] font-extrabold ${
                  formattedEta.value === "Arriving"
                    ? "text-emerald-600"
                    : "text-indigo-700"
                }`}
              >
                {formattedEta.value}
              </Text>

              {formattedEta.unit ? (
                <Text className="text-[9px] font-semibold text-ink-muted">
                  {formattedEta.unit} ETA
                </Text>
              ) : (
                <Text className="text-[9px] font-semibold text-emerald-600">
                  ETA
                </Text>
              )}
            </>
          ) : (
            <Text className="text-[10px] font-bold text-ink-muted">
              ETA unavailable
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
/*
 * ============================================================
 * ARRIVED
 * ============================================================
 */

function ArrivedSection({ jeepneys }: { jeepneys: AdminQueueJeepney[] }) {
  return (
    <View className="mt-3">
      <SectionTitle title="Arrived" subtitle="Recently arrived jeepneys" />

      {jeepneys.length === 0 ? (
        <EmptySection message="No recently arrived jeepneys." />
      ) : (
        <View className="mt-3">
          {jeepneys.map((jeepney) => (
            <View
              key={jeepney.id}
              className="mb-3 flex-row items-center rounded-[22px] border border-white/90 bg-white/70 p-4"
            >
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-emerald-50">
                <CheckCircle2 size={20} color="#059669" strokeWidth={2.3} />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[13px] font-extrabold text-ink-dark">
                  {jeepney.jeep_name || jeepney.plate_number}
                </Text>

                <Text className="mt-1 text-[10px] text-ink-secondary">
                  {jeepney.plate_number}
                </Text>
              </View>

              <Text className="text-[9px] font-extrabold uppercase tracking-[0.5px] text-emerald-700">
                Arrived
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/*
 * ============================================================
 * SECTION TITLE
 * ============================================================
 */

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row items-end justify-between">
      <View>
        <Text className="text-[16px] font-extrabold text-ink-dark">
          {title}
        </Text>

        <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/*
 * ============================================================
 * SMALL INFO
 * ============================================================
 */

function SmallInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="mr-4 flex-1">
      <View className="flex-row items-center">
        {icon}

        <Text className="ml-1 text-[8px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="mt-1 text-[10px] font-extrabold text-ink-dark"
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * LOADING SCREEN
 * ============================================================
 */

function LoadingScreen() {
  return (
    <OceanBackground>
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-[68px] w-[68px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
            <ActivityIndicator size="small" color={colors.primaryDark} />
          </View>

          <Text className="mt-4 text-[13px] font-bold text-ink-secondary">
            Loading queue...
          </Text>
        </View>
      </SafeAreaView>
    </OceanBackground>
  );
}

/*
 * ============================================================
 * EMPTY SECTION
 * ============================================================
 */

function EmptySection({ message }: { message: string }) {
  return (
    <View className="mt-3 rounded-[22px] border border-white/80 bg-white/60 px-5 py-5">
      <Text className="text-center text-[11px] font-semibold text-ink-muted">
        {message}
      </Text>
    </View>
  );
}

/*
 * ============================================================
 * ERROR
 * ============================================================
 */

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
      <View className="h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-red-50">
        <AlertCircle size={22} color="#DC2626" strokeWidth={2.3} />
      </View>

      <Text className="mt-4 text-[15px] font-extrabold text-ink-dark">
        Unable to load queue
      </Text>

      <Text className="mt-2 text-[11px] leading-[17px] text-ink-secondary">
        {message}
      </Text>

      <Pressable
        onPress={onRetry}
        className="mt-4 min-h-[46px] flex-row items-center justify-center rounded-full bg-ocean-400 px-5"
      >
        <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.4} />

        <Text className="ml-2 text-[12px] font-extrabold text-white">
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

/*
 * ============================================================
 * INFO ITEM
 * ============================================================
 */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-1 text-[11px] font-extrabold text-ink-dark"
      >
        {value}
      </Text>
    </View>
  );
}
