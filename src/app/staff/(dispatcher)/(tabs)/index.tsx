import { useLocalSearchParams, useRouter } from "expo-router";
import {
    AlertTriangle,
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Gauge,
    MapPin,
    Navigation,
    RefreshCw,
    Send,
    ShieldCheck,
    UserRound,
    Users,
    XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import JeepneyImage from "@/src/shared/components/jeepney/JeepneyImage";
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";
import { sendDriverAlert } from "@/src/shared/utils/driverAlerts";

type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

interface JeepneyDetails {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  image_url: string | null;

  driver_id: string | null;
  driver_name: string | null;

  bracket: number;
  capacity: number;
  current_occupancy: number;

  status: JeepneyStatus;

  queue_position: number | null;

  departure_time: string | null;
  eta: number | null;

  current_latitude: number | null;
  current_longitude: number | null;

  terminal_id: number;

  loading_ends_at: string | null;

  created_at: string;
  updated_at: string;

  last_occupancy_update: string | null;

  last_gps_at: string | null;
}

const SELECT_COLUMNS = `
  id,
  plate_number,
  jeep_name,
  image_url,
  driver_id,
  driver_name,
  bracket,
  capacity,
  current_occupancy,
  status,
  queue_position,
  departure_time,
  eta,
  current_latitude,
  current_longitude,
  terminal_id,
  loading_ends_at,
  created_at,
  updated_at,
  last_occupancy_update
`;

function isToday(dateString: string | null) {
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Not available";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString();
}

function formatTime(dateString: string | null) {
  if (!dateString) return "Not available";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getStatusPresentation(status: JeepneyStatus) {
  switch (status) {
    case "waiting":
      return { label: "Waiting", background: "#DBEAFE", color: "#0369A1" };
    case "loading":
      return { label: "Loading", background: "#FEF3C7", color: "#B45309" };
    case "en_route":
      return { label: "En Route", background: "#E0E7FF", color: "#4338CA" };
    case "arrived":
      return { label: "Arrived", background: "#D1FAE5", color: "#047857" };
    case "dispatched":
      return { label: "Dispatched", background: "#E0F2FE", color: "#0369A1" };
    default:
      return { label: "Inactive", background: "#F1F5F9", color: "#64748B" };
  }
}

export default function DispatcherJeepneyDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id: string | string[] }>();
  const jeepneyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [jeepney, setJeepney] = useState<JeepneyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ visible: false, type: "success", title: "", message: "" });

  const loadJeepney = useCallback(
    async (isRefresh = false) => {
      if (!jeepneyId) {
        setError("No jeepney ID was provided.");
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const { data, error: fetchError } = await supabase
          .from("jeepneys")
          .select(SELECT_COLUMNS)
          .eq("id", jeepneyId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setJeepney(null);
          setError("This jeepney could not be found.");
          return;
        }

        const { data: gpsData, error: gpsError } = await supabase
          .from("gps_tracking")
          .select("recorded_at")
          .eq("jeepney_id", jeepneyId)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (gpsError) {
          console.error("⚠️ Failed to load latest jeepney GPS:", gpsError);
        }

        const normalized: JeepneyDetails = {
          id: data.id,
          plate_number: data.plate_number ?? "",
          jeep_name: data.jeep_name ?? null,
          image_url: data.image_url ?? null,
          driver_id: data.driver_id ?? null,
          driver_name: data.driver_name ?? null,
          bracket: Number(data.bracket),
          capacity: Number(data.capacity ?? 24),
          current_occupancy: Number(data.current_occupancy ?? 0),
          status: (data.status ?? "inactive") as JeepneyStatus,
          queue_position:
            data.queue_position == null ? null : Number(data.queue_position),
          departure_time: data.departure_time ?? null,
          eta: data.eta == null ? null : Number(data.eta),
          current_latitude:
            data.current_latitude == null
              ? null
              : Number(data.current_latitude),
          current_longitude:
            data.current_longitude == null
              ? null
              : Number(data.current_longitude),
          terminal_id: Number(data.terminal_id ?? 1),
          loading_ends_at: data.loading_ends_at ?? null,
          created_at: data.created_at ?? "",
          updated_at: data.updated_at ?? "",
          last_occupancy_update: data.last_occupancy_update ?? null,
          last_gps_at: gpsData?.recorded_at ?? null,
        };

        setJeepney(normalized);
      } catch (err: any) {
        console.error("❌ Failed to load jeepney details:", err);
        setError(err?.message ?? "Unable to load jeepney information.");
        setJeepney(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [jeepneyId],
  );

  useEffect(() => {
    loadJeepney(false);
  }, [loadJeepney]);

  // Realtime jeepney + GPS updates — same live behavior as the admin screen.
  useEffect(() => {
    if (!jeepneyId) return;

    const channel = supabase
      .channel(`dispatcher-jeepney-details-${jeepneyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
          filter: `id=eq.${jeepneyId}`,
        },
        () => loadJeepney(true),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
          filter: `jeepney_id=eq.${jeepneyId}`,
        },
        () => loadJeepney(true),
      )
      .subscribe((status) => {
        console.log(`📡 Dispatcher jeepney details realtime: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jeepneyId, loadJeepney]);

  const status = useMemo(
    () => getStatusPresentation(jeepney?.status ?? "inactive"),
    [jeepney?.status],
  );

  const activeToday = useMemo(() => {
    if (!jeepney) return false;
    return isToday(jeepney.last_gps_at);
  }, [jeepney]);

  const occupancy = useMemo(() => {
    if (!jeepney) return 0;
    const capacity = Math.max(jeepney.capacity, 1);
    return Math.min(
      100,
      Math.round((jeepney.current_occupancy / capacity) * 100),
    );
  }, [jeepney]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/staff/(dispatcher)/(tabs)/queue");
    }
  };

  const handleSendAlert = async () => {
    if (!jeepney || sendingAlert) return;

    try {
      setSendingAlert(true);

      const result = await sendDriverAlert(jeepney.id, {
        title: "Dispatch Alert",
        message: `Dispatcher alert for ${jeepney.plate_number}.`,
        type: "dispatch",
      });

      setFeedback({
        visible: true,
        type: "success",
        title: "Alert Sent",
        message: result.pushSent
          ? `${jeepney.plate_number}'s driver has been notified by push notification and in-app alert.`
          : `${jeepney.plate_number}'s driver has been notified in-app. Their device is not registered for push notifications.`,
      });
    } catch (err: any) {
      console.error("❌ Failed to send driver alert:", err);

      setFeedback({
        visible: true,
        type: "error",
        title: "Unable to Send Alert",
        message: err?.message ?? "The driver alert could not be sent.",
      });
    } finally {
      setSendingAlert(false);
    }
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.25}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading jeepney...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Getting the latest fleet information
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (!jeepney) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-5 pt-4">
            <Header onBack={handleBack} />

            <View className="mt-8 items-center rounded-[26px] border border-white/90 bg-clay-surface px-6 py-9">
              <View className="h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-red-50">
                <AlertTriangle size={27} color="#DC2626" strokeWidth={2.3} />
              </View>

              <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
                Jeepney unavailable
              </Text>

              <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
                {error ?? "The requested jeepney could not be found."}
              </Text>

              <Pressable
                onPress={() => loadJeepney(true)}
                className="mt-5 h-[44px] flex-row items-center justify-center rounded-full bg-ocean-400 px-6"
              >
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="ml-2 text-[12px] font-extrabold text-white">
                  Retry
                </Text>
              </Pressable>
            </View>
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
              onRefresh={() => loadJeepney(true)}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 140,
          }}
        >
          <Header onBack={handleBack} />

          {/* HERO */}
          <View className="mt-4 rounded-[28px] border border-white/90 bg-clay-surface p-5">
            <View className="flex-row items-center">
              <JeepneyImage
                uri={jeepney.image_url}
                size={62}
                iconSize={30}
                rounded={21}
              />

              <View className="ml-4 flex-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.1px] text-ocean-700">
                  JEEPNEY DETAILS
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-1 text-[21px] font-extrabold text-ink-dark"
                >
                  {jeepney.jeep_name ||
                    jeepney.plate_number ||
                    "Unnamed Jeepney"}
                </Text>

                <Text className="mt-0.5 text-[11px] font-semibold text-ink-secondary">
                  {jeepney.plate_number || "No plate number"}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row items-center">
              <View
                className="rounded-full px-3 py-2"
                style={{ backgroundColor: status.background }}
              >
                <Text
                  className="text-[10px] font-extrabold uppercase"
                  style={{ color: status.color }}
                >
                  {status.label}
                </Text>
              </View>

              <View
                className={`ml-2 flex-row items-center rounded-full px-3 py-2 ${
                  activeToday ? "bg-emerald-50" : "bg-slate-100"
                }`}
              >
                {activeToday ? (
                  <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                ) : (
                  <XCircle size={13} color="#64748B" strokeWidth={2.5} />
                )}

                <Text
                  className={`ml-1.5 text-[10px] font-extrabold ${
                    activeToday ? "text-emerald-700" : "text-slate-600"
                  }`}
                >
                  {activeToday ? "Active Today" : "Inactive Today"}
                </Text>
              </View>
            </View>

            {!activeToday && (
              <View className="mt-4 rounded-[17px] bg-slate-100 px-4 py-3">
                <Text className="text-[9px] font-extrabold uppercase tracking-[0.6px] text-slate-500">
                  GPS Status
                </Text>

                <Text className="mt-1 text-[10px] font-semibold leading-[16px] text-slate-600">
                  This jeepney has not sent a GPS location today.
                </Text>
              </View>
            )}
          </View>

          {/* ASSIGNMENT */}
          <SectionTitle
            icon={
              <UserRound
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Assignment"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <DetailRow
              icon={<UserRound size={17} color="#64748B" strokeWidth={2.2} />}
              label="Driver"
              value={jeepney.driver_name || "No driver assigned"}
            />
            <Divider />
            <DetailRow
              icon={<MapPin size={17} color="#64748B" strokeWidth={2.2} />}
              label="Terminal"
              value={`Terminal ${jeepney.terminal_id}`}
            />
            <Divider />
            <DetailRow
              icon={<Gauge size={17} color="#64748B" strokeWidth={2.2} />}
              label="Bracket"
              value={String(jeepney.bracket)}
            />
          </View>

          {/* OCCUPANCY */}
          <SectionTitle
            icon={
              <Users size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="Occupancy"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                  Current passengers
                </Text>

                <Text className="mt-1 text-[27px] font-extrabold text-ink-dark">
                  {jeepney.current_occupancy}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[11px] font-bold text-ink-secondary">
                  Capacity
                </Text>

                <Text className="mt-1 text-[16px] font-extrabold text-ink-dark">
                  {jeepney.capacity}
                </Text>
              </View>
            </View>

            <View className="mt-4 h-[9px] overflow-hidden rounded-full bg-slate-100">
              <View
                className="h-full rounded-full bg-ocean-400"
                style={{ width: `${occupancy}%` }}
              />
            </View>

            <View className="mt-2 flex-row justify-between">
              <Text className="text-[9px] font-semibold text-ink-muted">
                Occupancy
              </Text>

              <Text className="text-[10px] font-extrabold text-ocean-700">
                {occupancy}%
              </Text>
            </View>

            <View className="mt-4 rounded-[17px] bg-slate-50 px-4 py-3">
              <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
                Last occupancy update
              </Text>

              <Text className="mt-1 text-[11px] font-extrabold text-ink-dark">
                {formatDate(jeepney.last_occupancy_update)}
              </Text>
            </View>
          </View>

          {/* QUEUE / TRIP */}
          <SectionTitle
            icon={
              <Clock3 size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="Queue & Trip"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <DetailRow
              icon={<Clock3 size={17} color="#64748B" strokeWidth={2.2} />}
              label="Queue position"
              value={
                jeepney.queue_position !== null
                  ? `#${jeepney.queue_position}`
                  : "Not in queue"
              }
            />
            <Divider />
            <DetailRow
              icon={<Navigation size={17} color="#64748B" strokeWidth={2.2} />}
              label="Departure"
              value={formatTime(jeepney.departure_time)}
            />
            <Divider />
            <DetailRow
              icon={<Clock3 size={17} color="#64748B" strokeWidth={2.2} />}
              label="ETA"
              value={
                jeepney.eta !== null
                  ? `${jeepney.eta} minutes`
                  : "Not available"
              }
            />
            <Divider />
            <DetailRow
              icon={<Clock3 size={17} color="#64748B" strokeWidth={2.2} />}
              label="Loading ends"
              value={formatTime(jeepney.loading_ends_at)}
            />
          </View>

          {/* GPS */}
          <SectionTitle
            icon={
              <MapPin size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="GPS & Location"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <View className="flex-row">
              <GpsValue
                label="Latitude"
                value={
                  jeepney.current_latitude !== null
                    ? jeepney.current_latitude.toFixed(6)
                    : "Unavailable"
                }
              />
              <GpsValue
                label="Longitude"
                value={
                  jeepney.current_longitude !== null
                    ? jeepney.current_longitude.toFixed(6)
                    : "Unavailable"
                }
              />
            </View>

            <View className="mt-4 rounded-[18px] bg-ocean-50 px-4 py-3">
              <View className="flex-row items-center">
                <Navigation
                  size={15}
                  color={colors.primaryDark}
                  strokeWidth={2.4}
                />
                <Text className="ml-2 text-[9px] font-extrabold uppercase tracking-[0.5px] text-ocean-700">
                  Latest GPS ping
                </Text>
              </View>

              <Text className="mt-1.5 text-[11px] font-extrabold text-ink-dark">
                {formatDate(jeepney.last_gps_at)}
              </Text>

              <Text
                className={`mt-1 text-[10px] font-bold ${
                  activeToday ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                {activeToday
                  ? "GPS activity detected today."
                  : "No GPS activity detected today."}
              </Text>
            </View>
          </View>

          {/* SYSTEM INFORMATION */}
          <SectionTitle
            icon={
              <ShieldCheck
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="System Information"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <DetailRow
              icon={<ShieldCheck size={17} color="#64748B" strokeWidth={2.2} />}
              label="Jeepney ID"
              value={jeepney.id}
            />
            <Divider />
            <DetailRow
              icon={<UserRound size={17} color="#64748B" strokeWidth={2.2} />}
              label="Driver ID"
              value={jeepney.driver_id || "No driver ID"}
            />
            <Divider />
            <DetailRow
              icon={
                <CalendarClock size={17} color="#64748B" strokeWidth={2.2} />
              }
              label="Created"
              value={formatDate(jeepney.created_at)}
            />
            <Divider />
            <DetailRow
              icon={<RefreshCw size={17} color="#64748B" strokeWidth={2.2} />}
              label="Last updated"
              value={formatDate(jeepney.updated_at)}
            />
          </View>

          {/* DISPATCHER ACTIONS */}
          <SectionTitle
            icon={
              <Send size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="Dispatcher Actions"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[10px] leading-[16px] text-ink-secondary">
              Send this driver a dispatch alert — they'll get both a push
              notification and an in-app alert.
            </Text>

            <Pressable
              disabled={sendingAlert || !jeepney.driver_id}
              onPress={handleSendAlert}
              className={`mt-4 h-[50px] flex-row items-center justify-center rounded-[17px] ${
                jeepney.driver_id ? "bg-ocean-400" : "bg-slate-200"
              }`}
            >
              {sendingAlert ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
                  <Text className="ml-2 text-[12px] font-extrabold text-white">
                    {jeepney.driver_id
                      ? "Send Alert to Driver"
                      : "No Driver Assigned"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {error && (
            <View className="mt-5 rounded-[22px] border border-red-100 bg-white/90 p-4">
              <View className="flex-row items-center">
                <AlertTriangle size={18} color="#DC2626" strokeWidth={2.3} />
                <Text className="ml-2 flex-1 text-[10px] font-semibold text-red-700">
                  {error}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {feedback.visible && (
          <FeedbackModal
            type={feedback.type}
            title={feedback.title}
            message={feedback.message}
            onClose={() =>
              setFeedback((current) => ({ ...current, visible: false }))
            }
          />
        )}
      </SafeAreaView>
    </OceanBackground>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={onBack}
        className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface"
      >
        <ArrowLeft size={20} color="#334155" strokeWidth={2.4} />
      </Pressable>

      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
          DISPATCHER
        </Text>

        <Text className="mt-0.5 text-[19px] font-extrabold text-ink-dark">
          Jeepney Details
        </Text>
      </View>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="mb-2 mt-6 flex-row items-center">
      <View className="h-[31px] w-[31px] items-center justify-center rounded-[11px] bg-ocean-100">
        {icon}
      </View>

      <Text className="ml-2 text-[14px] font-extrabold text-ink-dark">
        {title}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-slate-50">
        {icon}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[9px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-0.5 text-[11px] font-extrabold text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function GpsValue({ label, value }: { label: string; value: string }) {
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

function Divider() {
  return <View className="my-3 h-[1px] bg-slate-100" />;
}

function FeedbackModal({
  type,
  title,
  message,
  onClose,
}: {
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const isSuccess = type === "success";

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.28)" }}
    >
      <View
        className="w-full rounded-[30px] border border-white/90 bg-clay-surface p-6"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 25,
          elevation: 10,
        }}
      >
        <View className="items-center">
          <View
            className="h-[64px] w-[64px] items-center justify-center rounded-[22px]"
            style={{ backgroundColor: isSuccess ? "#D1FAE5" : "#FEE2E2" }}
          >
            {isSuccess ? (
              <CheckCircle2 size={30} color="#059669" strokeWidth={2.4} />
            ) : (
              <AlertTriangle size={30} color="#DC2626" strokeWidth={2.4} />
            )}
          </View>

          <Text className="mt-4 text-center text-[17px] font-extrabold text-ink-dark">
            {title}
          </Text>

          <Text className="mt-2 text-center text-[11px] leading-[18px] text-ink-secondary">
            {message}
          </Text>
        </View>

        <Pressable
          onPress={onClose}
          className="mt-6 h-[48px] items-center justify-center rounded-[17px] bg-ocean-400"
        >
          <Text className="text-[12px] font-extrabold text-white">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
