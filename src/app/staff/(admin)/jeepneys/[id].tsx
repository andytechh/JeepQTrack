import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";

type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

interface JeepneyDetails {
  id: string;
  plate_number: string;
  jeep_name: string | null;

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

type ModalType = "success" | "error" | "confirm-disable" | "confirm-delete";

interface ActionModalState {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
}

const SELECT_COLUMNS = `
  id,
  plate_number,
  jeep_name,
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
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Not available";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

function formatTime(dateString: string | null) {
  if (!dateString) {
    return "Not available";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusPresentation(status: JeepneyStatus) {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting",
        background: "#DBEAFE",
        color: "#0369A1",
      };

    case "loading":
      return {
        label: "Loading",
        background: "#FEF3C7",
        color: "#B45309",
      };

    case "en_route":
      return {
        label: "En Route",
        background: "#E0E7FF",
        color: "#4338CA",
      };

    case "arrived":
      return {
        label: "Arrived",
        background: "#D1FAE5",
        color: "#047857",
      };

    case "dispatched":
      return {
        label: "Dispatched",
        background: "#E0F2FE",
        color: "#0369A1",
      };

    default:
      return {
        label: "Inactive",
        background: "#F1F5F9",
        color: "#64748B",
      };
  }
}

export default function AdminJeepneyDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id: string | string[];
  }>();

  const jeepneyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [jeepney, setJeepney] = useState<JeepneyDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  const [modal, setModal] = useState<ActionModalState>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  /*
   * Automatically marks the jeepney inactive when its latest GPS
   * ping is not from today.
   *
   * This only changes the status to inactive.
   * It does NOT disable the terminal assignment.
   */
  const applyInactiveIfNoGpsToday = useCallback(
    async (
      id: string,
      lastGpsAt: string | null,
      currentStatus: JeepneyStatus,
    ) => {
      if (!lastGpsAt || !isToday(lastGpsAt)) {
        if (currentStatus === "inactive") {
          return;
        }

        const { error: updateError } = await supabase
          .from("jeepneys")
          .update({
            status: "inactive",
          })
          .eq("id", id);

        if (updateError) {
          console.error(
            "⚠️ Failed to automatically mark jeepney inactive:",
            updateError,
          );

          return;
        }

        setJeepney((current) =>
          current && current.id === id
            ? {
                ...current,
                status: "inactive",
              }
            : current,
        );
      }
    },
    [],
  );

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

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          setJeepney(null);
          setError("This jeepney could not be found.");
          return;
        }

        /*
         * Get the latest GPS record.
         */
        const { data: gpsData, error: gpsError } = await supabase
          .from("gps_tracking")
          .select("recorded_at")
          .eq("jeepney_id", jeepneyId)
          .order("recorded_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (gpsError) {
          console.error("⚠️ Failed to load latest jeepney GPS:", gpsError);
        }

        const lastGpsAt = gpsData?.recorded_at ?? null;

        /*
         * Normalize the database record.
         *
         * Bracket is always a number.
         * We do not allow it to become null.
         */
        const normalized: JeepneyDetails = {
          id: data.id,

          plate_number: data.plate_number ?? "",

          jeep_name: data.jeep_name ?? null,

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

          last_gps_at: lastGpsAt,
        };

        setJeepney(normalized);

        /*
         * IMPORTANT:
         *
         * If the jeepney has not sent GPS today, persist inactive
         * status in the database.
         */
        await applyInactiveIfNoGpsToday(
          normalized.id,
          normalized.last_gps_at,
          normalized.status,
        );
      } catch (err: any) {
        console.error("❌ Failed to load jeepney details:", err);

        setError(err?.message ?? "Unable to load jeepney information.");

        setJeepney(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [jeepneyId, applyInactiveIfNoGpsToday],
  );

  /*
   * Initial load.
   */
  useEffect(() => {
    loadJeepney(false);
  }, [loadJeepney]);

  /*
   * Realtime jeepney + GPS updates.
   */
  useEffect(() => {
    if (!jeepneyId) {
      return;
    }

    const channel = supabase
      .channel(`admin-jeepney-details-${jeepneyId}`)

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
          filter: `id=eq.${jeepneyId}`,
        },
        () => {
          loadJeepney(true);
        },
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
          filter: `jeepney_id=eq.${jeepneyId}`,
        },
        (payload) => {
          const gps = payload.new as any;

          const recordedAt = gps.recorded_at ?? new Date().toISOString();

          setJeepney((current) =>
            current
              ? {
                  ...current,
                  last_gps_at: recordedAt,
                }
              : current,
          );

          /*
           * GPS activity means the jeepney is active today.
           *
           * We intentionally do not force a status such as waiting
           * or loading because the driver's actual workflow owns
           * that status.
           */
          loadJeepney(true);
        },
      )

      .subscribe((status) => {
        console.log(`📡 Jeepney details realtime: ${status}`);
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
    if (!jeepney) {
      return false;
    }

    return isToday(jeepney.last_gps_at);
  }, [jeepney]);

  const occupancy = useMemo(() => {
    if (!jeepney) {
      return 0;
    }

    const capacity = Math.max(jeepney.capacity, 1);

    return Math.min(
      100,
      Math.round((jeepney.current_occupancy / capacity) * 100),
    );
  }, [jeepney]);

  const showSuccess = (title: string, message: string) => {
    setModal({
      visible: true,
      type: "success",
      title,
      message,
    });
  };

  const showError = (title: string, message: string) => {
    setModal({
      visible: true,
      type: "error",
      title,
      message,
    });
  };

  const closeModal = () => {
    if (actionLoading) {
      return;
    }

    setModal((current) => ({
      ...current,
      visible: false,
    }));
  };

  const confirmDisable = () => {
    if (!jeepney || actionLoading) {
      return;
    }

    setModal({
      visible: true,
      type: "confirm-disable",
      title: "Disable Jeepney?",
      message:
        "This jeepney will be marked inactive and removed from the active terminal fleet. Its record will not be deleted.",
    });
  };

  const confirmDelete = () => {
    if (!jeepney || actionLoading) {
      return;
    }

    setModal({
      visible: true,
      type: "confirm-delete",
      title: "Delete Jeepney?",
      message:
        "This will permanently remove the jeepney and its terminal assignment. This action cannot be undone.",
    });
  };

  const handleDisable = async () => {
    if (!jeepney) {
      return;
    }

    try {
      setActionLoading(true);

      /*
       * Disable terminal assignment.
       */
      const { error: terminalError } = await supabase
        .from("terminal_jeepneys")
        .update({
          is_active: false,
        })
        .eq("jeepney_id", jeepney.id);

      if (terminalError) {
        throw terminalError;
      }

      /*
       * Also set jeepney status inactive.
       */
      const { error: jeepneyError } = await supabase
        .from("jeepneys")
        .update({
          status: "inactive",
        })
        .eq("id", jeepney.id);

      if (jeepneyError) {
        throw jeepneyError;
      }

      setJeepney((current) =>
        current
          ? {
              ...current,
              status: "inactive",
            }
          : current,
      );

      setModal({
        visible: true,
        type: "success",
        title: "Jeepney Disabled",
        message:
          "The jeepney has been disabled and is no longer part of the active terminal fleet.",
      });
    } catch (err: any) {
      console.error("❌ Failed to disable jeepney:", err);

      showError(
        "Unable to Disable",
        err?.message ?? "The jeepney could not be disabled.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!jeepney) {
      return;
    }

    try {
      setActionLoading(true);

      /*
       * Remove terminal assignment first.
       */
      const { error: assignmentError } = await supabase
        .from("terminal_jeepneys")
        .delete()
        .eq("jeepney_id", jeepney.id);

      if (assignmentError) {
        throw assignmentError;
      }

      /*
       * Delete jeepney.
       */
      const { error: jeepneyError } = await supabase
        .from("jeepneys")
        .delete()
        .eq("id", jeepney.id);

      if (jeepneyError) {
        throw jeepneyError;
      }

      setJeepney(null);

      setModal({
        visible: true,
        type: "success",
        title: "Jeepney Deleted",
        message: "The jeepney has been permanently removed from the fleet.",
      });
    } catch (err: any) {
      console.error("❌ Failed to delete jeepney:", err);

      showError(
        "Unable to Delete",
        err?.message ?? "The jeepney could not be deleted.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/staff/(admin)/jeepneys");
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

          <AdminActionModal
            visible={modal.visible}
            type={modal.type}
            title={modal.title}
            message={modal.message}
            loading={actionLoading}
            onClose={closeModal}
            onConfirm={
              modal.type === "confirm-disable"
                ? handleDisable
                : modal.type === "confirm-delete"
                  ? handleDelete
                  : undefined
            }
          />
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

          {/* =====================================================
              HERO
          ====================================================== */}

          <View className="mt-4 rounded-[28px] border border-white/90 bg-clay-surface p-5">
            <View className="flex-row items-center">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-[21px] bg-ocean-100">
                <BusFront
                  size={30}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

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
                style={{
                  backgroundColor: status.background,
                }}
              >
                <Text
                  className="text-[10px] font-extrabold uppercase"
                  style={{
                    color: status.color,
                  }}
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
                  This jeepney has not sent a GPS location today, so its status
                  has been automatically marked inactive.
                </Text>
              </View>
            )}
          </View>

          {/* =====================================================
              ASSIGNMENT
          ====================================================== */}

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

          {/* =====================================================
              OCCUPANCY
          ====================================================== */}

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
                style={{
                  width: `${occupancy}%`,
                }}
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

          {/* =====================================================
              QUEUE / TRIP
          ====================================================== */}

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

          {/* =====================================================
              GPS
          ====================================================== */}

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
                  : "No GPS activity detected today. Jeepney marked inactive."}
              </Text>
            </View>
          </View>

          {/* =====================================================
              SYSTEM INFORMATION
          ====================================================== */}

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

          {/* =====================================================
              ADMIN ACTIONS
          ====================================================== */}

          <SectionTitle
            icon={
              <ShieldCheck
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Admin Actions"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[10px] leading-[16px] text-ink-secondary">
              Manage this jeepney's availability or permanently remove it from
              the fleet.
            </Text>

            <Pressable
              disabled={actionLoading || jeepney.status === "inactive"}
              onPress={confirmDisable}
              className={`mt-4 h-[50px] flex-row items-center justify-center rounded-[17px] border ${
                jeepney.status === "inactive"
                  ? "border-slate-200 bg-slate-100"
                  : "border-white/90 bg-amber-50"
              }`}
            >
              <Power
                size={18}
                color={jeepney.status === "inactive" ? "#94A3B8" : "#B45309"}
                strokeWidth={2.4}
              />

              <Text
                className={`ml-2 text-[12px] font-extrabold ${
                  jeepney.status === "inactive"
                    ? "text-slate-400"
                    : "text-amber-700"
                }`}
              >
                {jeepney.status === "inactive"
                  ? "Jeepney Disabled"
                  : "Disable Jeepney"}
              </Text>
            </Pressable>

            <Pressable
              disabled={actionLoading}
              onPress={confirmDelete}
              className="mt-3 h-[50px] flex-row items-center justify-center rounded-[17px] border border-red-100 bg-red-50"
            >
              <Trash2 size={18} color="#DC2626" strokeWidth={2.4} />

              <Text className="ml-2 text-[12px] font-extrabold text-red-700">
                Delete Jeepney
              </Text>
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

        <AdminActionModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          loading={actionLoading}
          onClose={closeModal}
          onConfirm={
            modal.type === "confirm-disable"
              ? handleDisable
              : modal.type === "confirm-delete"
                ? handleDelete
                : undefined
          }
        />
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ================================================================
   HEADER
================================================================ */

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
          ADMIN
        </Text>

        <Text className="mt-0.5 text-[19px] font-extrabold text-ink-dark">
          Jeepney Details
        </Text>
      </View>
    </View>
  );
}

/* ================================================================
   SECTION TITLE
================================================================ */

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

/* ================================================================
   DETAIL ROW
================================================================ */

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

/* ================================================================
   GPS VALUE
================================================================ */

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

/* ================================================================
   DIVIDER
================================================================ */

function Divider() {
  return <View className="my-3 h-[1px] bg-slate-100" />;
}

/* ================================================================
   ADMIN ACTION MODAL
================================================================ */

function AdminActionModal({
  visible,
  type,
  title,
  message,
  loading,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  loading: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  if (!visible) {
    return null;
  }

  const isSuccess = type === "success";
  const isError = type === "error";
  const isDelete = type === "confirm-delete";
  const isConfirm = type === "confirm-disable" || type === "confirm-delete";

  const iconBackground = isSuccess
    ? "#D1FAE5"
    : isError
      ? "#FEE2E2"
      : isDelete
        ? "#FEE2E2"
        : "#FEF3C7";

  const iconColor = isSuccess
    ? "#059669"
    : isError
      ? "#DC2626"
      : isDelete
        ? "#DC2626"
        : "#B45309";

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.28)",
      }}
    >
      <View
        className="w-full rounded-[30px] border border-white/90 bg-clay-surface p-6"
        style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 12,
          },
          shadowOpacity: 0.12,
          shadowRadius: 25,
          elevation: 10,
        }}
      >
        <View className="items-center">
          <View
            className="h-[64px] w-[64px] items-center justify-center rounded-[22px]"
            style={{
              backgroundColor: iconBackground,
            }}
          >
            {isSuccess ? (
              <CheckCircle2 size={30} color={iconColor} strokeWidth={2.4} />
            ) : isError ? (
              <AlertTriangle size={30} color={iconColor} strokeWidth={2.4} />
            ) : isDelete ? (
              <Trash2 size={29} color={iconColor} strokeWidth={2.4} />
            ) : (
              <Power size={30} color={iconColor} strokeWidth={2.4} />
            )}
          </View>

          <Text className="mt-4 text-center text-[17px] font-extrabold text-ink-dark">
            {title}
          </Text>

          <Text className="mt-2 text-center text-[11px] leading-[18px] text-ink-secondary">
            {message}
          </Text>
        </View>

        {isConfirm ? (
          <View className="mt-6 flex-row">
            <Pressable
              disabled={loading}
              onPress={onClose}
              className="mr-2 h-[48px] flex-1 items-center justify-center rounded-[17px] border border-white/90 bg-white"
            >
              <Text className="text-[12px] font-extrabold text-ink-secondary">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={onConfirm}
              className={`ml-2 h-[48px] flex-1 flex-row items-center justify-center rounded-[17px] ${
                isDelete ? "bg-red-500" : "bg-amber-500"
              }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : isDelete ? (
                <Trash2 size={16} color="#FFFFFF" strokeWidth={2.4} />
              ) : (
                <Power size={16} color="#FFFFFF" strokeWidth={2.4} />
              )}

              <Text className="ml-2 text-[12px] font-extrabold text-white">
                {loading ? "Processing..." : isDelete ? "Delete" : "Disable"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={loading}
            onPress={onClose}
            className="mt-6 h-[48px] items-center justify-center rounded-[17px] bg-ocean-400"
          >
            <Text className="text-[12px] font-extrabold text-white">Done</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
