import { Clock, MapPin, Search } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View
} from "react-native";

import ClayButton from "@/src/shared/components/clay/ClayButton";
import { supabase } from "@/src/shared/config/supabase";
import { useTheme } from "@/src/shared/context/ThemeContext";
import { useJeepneyNotify } from "@/src/shared/hooks/useJeepneyNotify";
import { useTerminalNotifications } from "@/src/shared/hooks/useTerminalNotification";
import { DispatchService } from "@/src/shared/services/DispatchService";
import { useAuthStore } from "@/src/shared/store/authStore";

const LOADING_DURATION_MS = 30 * 60 * 1000;

interface QueueJeepney {
  id: string;
  plate_number: string;
  driver_name: string | null;
  driver_id: string | null;
  jeep_name: string | null;
  status: string;
  terminal_id: number;
  bracket: number | null;
  queue_position: number | null;
  current_occupancy: number | null;
  capacity: number | null;
  loading_started_at: string | null;
  loading_ends_at: string | null;
  entered_geofence_at: string | null;
}

interface RecentTrip {
  id: string;
  jeepney_id: string;
  route: string | null;
  passengers: number | null;
  started_at: string;
  jeepneys: {
    plate_number: string | null;
    driver_name: string | null;
  } | null;
}

interface QueueSection {
  title: string;
  terminalId: number;
  data: QueueJeepney[];
}

function terminalName(id: number) {
  return id === 1 ? "Donsol" : "Daraga";
}

function routeForTerminal(id: number) {
  return id === 1 ? "Donsol → Daraga" : "Daraga → Donsol";
}

function useNowTick() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return now;
}

function formatTime(value: string | null) {
  if (!value) return "--";

  return new Date(value).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function LoadingTimer({
  jeepney,
  now,
  isDark,
}: {
  jeepney: QueueJeepney;
  now: number;
  isDark: boolean;
}) {
  if (jeepney.status !== "loading") {
    return null;
  }

  let endTime = jeepney.loading_ends_at
    ? new Date(jeepney.loading_ends_at).getTime()
    : null;

  if (!endTime && jeepney.loading_started_at) {
    endTime =
      new Date(jeepney.loading_started_at).getTime() + LOADING_DURATION_MS;
  }

  if (!endTime) {
    return null;
  }

  const remaining = Math.max(0, endTime - now);
  const totalSeconds = Math.floor(remaining / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: isDark ? "#243247" : "#E8F7FF",
      }}
    >
      <Clock size={13} color={remaining > 0 ? "#0284C7" : "#EF4444"} />

      <Text
        style={{
          marginLeft: 5,
          fontSize: 11,
          fontWeight: "800",
          color: remaining > 0 ? "#0284C7" : "#EF4444",
        }}
      >
        {remaining > 0
          ? `${minutes}:${String(seconds).padStart(2, "0")} remaining`
          : "Loading time ended"}
      </Text>
    </View>
  );
}

function JeepneyNotifyButton({
  jeepneyId,
  isDark,
}: {
  jeepneyId: string;
  isDark: boolean;
}) {
  const { subscribed, toggle, saving, loading } = useJeepneyNotify(jeepneyId);

  return (
    <ClayButton
      title={loading ? "Checking..." : subscribed ? "Notify On" : "Notify Me"}
      onPress={toggle}
      loading={saving}
      disabled={loading}
      className={
        subscribed
          ? "min-h-[42px] bg-green-500"
          : `min-h-[42px] ${isDark ? "bg-sky-700" : "bg-sky-500"}`
      }
    />
  );
}

function TerminalNotifyButton({
  terminalId,
  isDark,
}: {
  terminalId: number;
  isDark: boolean;
}) {
  const { isSubscribed, toggle, savingId, loading, remainingMinutes } =
    useTerminalNotifications();

  const subscribed = isSubscribed(terminalId);
  const remaining = remainingMinutes(terminalId);

  return (
    <View style={{ marginTop: 8 }}>
      <ClayButton
        title={
          loading
            ? "Checking..."
            : subscribed
              ? `Terminal Alerts On${remaining > 0 ? ` · ${remaining}m` : ""}`
              : "Notify Terminal"
        }
        onPress={() => toggle(terminalId)}
        loading={savingId === terminalId}
        disabled={loading}
        className={
          subscribed
            ? "min-h-[46px] bg-green-500"
            : `min-h-[46px] ${isDark ? "bg-sky-700" : "bg-sky-500"}`
        }
      />
    </View>
  );
}

function QueueItemCard({
  item,
  now,
  dispatching,
  onDispatch,
  isDark,
}: {
  item: QueueJeepney;
  now: number;
  dispatching: boolean;
  onDispatch: () => void;
  isDark: boolean;
}) {
  const occupancy = item.current_occupancy ?? 0;
  const capacity = item.capacity ?? 0;

  const occupancyPercent =
    capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;

  const statusLabel =
    item.status === "loading"
      ? "LOADING"
      : item.status === "waiting"
        ? "WAITING"
        : item.status.toUpperCase();

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginVertical: 6,
        padding: 15,
        borderRadius: 24,
        backgroundColor: isDark ? "#172033" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "#263449" : "#D9EAF4",
        shadowColor: "#38BDF8",
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: isDark ? 0.08 : 0.12,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isDark ? "#F8FAFC" : "#0F172A",
              fontSize: 17,
              fontWeight: "900",
            }}
          >
            {item.plate_number}
          </Text>

          <Text
            style={{
              marginTop: 3,
              color: isDark ? "#CBD5E1" : "#475569",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {item.jeep_name || "Jeepney"}
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: isDark ? "#94A3B8" : "#64748B",
              fontSize: 11,
            }}
          >
            Driver: {item.driver_name || "Unassigned"}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor:
              item.status === "loading"
                ? isDark
                  ? "#164E63"
                  : "#E0F2FE"
                : isDark
                  ? "#243247"
                  : "#F1F5F9",
          }}
        >
          <Text
            style={{
              color:
                item.status === "loading"
                  ? "#0284C7"
                  : isDark
                    ? "#CBD5E1"
                    : "#475569",
              fontSize: 9,
              fontWeight: "900",
            }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginTop: 13,
          gap: 8,
        }}
      >
        <View
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 15,
            backgroundColor: isDark ? "#1E293B" : "#F7FBFE",
          }}
        >
          <Text
            style={{
              color: isDark ? "#64748B" : "#94A3B8",
              fontSize: 9,
              fontWeight: "800",
            }}
          >
            BRACKET
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: isDark ? "#F8FAFC" : "#0F172A",
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {item.bracket ?? "--"}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 15,
            backgroundColor: isDark ? "#1E293B" : "#F7FBFE",
          }}
        >
          <Text
            style={{
              color: isDark ? "#64748B" : "#94A3B8",
              fontSize: 9,
              fontWeight: "800",
            }}
          >
            OCCUPANCY
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: isDark ? "#F8FAFC" : "#0F172A",
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {occupancy}/{capacity || "--"}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 15,
            backgroundColor: isDark ? "#1E293B" : "#F7FBFE",
          }}
        >
          <Text
            style={{
              color: isDark ? "#64748B" : "#94A3B8",
              fontSize: 9,
              fontWeight: "800",
            }}
          >
            POSITION
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: isDark ? "#F8FAFC" : "#0F172A",
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            #{item.queue_position ?? "--"}
          </Text>
        </View>
      </View>

      <View
        style={{
          height: 7,
          marginTop: 12,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: isDark ? "#263449" : "#E2E8F0",
        }}
      >
        <View
          style={{
            width: `${occupancyPercent}%`,
            height: "100%",
            backgroundColor: "#0EA5E9",
          }}
        />
      </View>

      <LoadingTimer item={undefined as never} now={now} />

      <View style={{ marginTop: 9 }}>
        <LoadingTimer jeepney={item} now={now} isDark={isDark} />
      </View>

      <View
        style={{
          marginTop: 12,
          padding: 11,
          borderRadius: 16,
          backgroundColor: isDark ? "#1E293B" : "#F7FBFE",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <MapPin size={14} color="#0284C7" />

          <Text
            style={{
              marginLeft: 6,
              color: isDark ? "#CBD5E1" : "#475569",
              fontSize: 11,
              fontWeight: "800",
            }}
          >
            {routeForTerminal(item.terminal_id)}
          </Text>
        </View>

        <Text
          style={{
            marginTop: 4,
            color: isDark ? "#64748B" : "#94A3B8",
            fontSize: 9,
          }}
        >
          Entered: {formatTime(item.entered_geofence_at)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <JeepneyNotifyButton jeepneyId={item.id} isDark={isDark} />
        </View>

        <View style={{ flex: 1 }}>
          <ClayButton
            title="Dispatch Now"
            onPress={onDispatch}
            loading={dispatching}
            disabled={item.status !== "loading"}
            className="min-h-[42px] bg-ocean-400"
          />
        </View>
      </View>
    </View>
  );
}

function RecentTripRow({
  trip,
  isDark,
}: {
  trip: RecentTrip;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        marginHorizontal: 12,
        marginVertical: 4,
        padding: 13,
        borderRadius: 18,
        backgroundColor: isDark ? "#172033" : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? "#263449" : "#D9EAF4",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isDark ? "#F8FAFC" : "#0F172A",
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {trip.jeepneys?.plate_number || "Unknown Jeepney"}
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: isDark ? "#94A3B8" : "#64748B",
              fontSize: 10,
            }}
          >
            {trip.route || "Route unavailable"}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              color: isDark ? "#CBD5E1" : "#475569",
              fontSize: 11,
              fontWeight: "800",
            }}
          >
            {trip.passengers ?? 0} passengers
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: isDark ? "#64748B" : "#94A3B8",
              fontSize: 9,
            }}
          >
            {formatTime(trip.started_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DispatcherQueueScreen() {
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const now = useNowTick();

  const [jeepneys, setJeepneys] = useState<QueueJeepney[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(
        `
        id,
        plate_number,
        driver_name,
        driver_id,
        jeep_name,
        status,
        terminal_id,
        bracket,
        queue_position,
        current_occupancy,
        capacity,
        loading_started_at,
        loading_ends_at,
        entered_geofence_at
      `,
      )
      .in("status", ["waiting", "loading"])
      .order("terminal_id", { ascending: true })
      .order("bracket", { ascending: true })
      .order("queue_position", { ascending: true });

    if (error) {
      console.error("Failed to load queue:", error);
      throw error;
    }

    setJeepneys((data ?? []) as QueueJeepney[]);
  }, []);

  const fetchRecentTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        id,
        jeepney_id,
        route,
        passengers,
        started_at,
        jeepneys:jeepney_id (
          plate_number,
          driver_name
        )
      `,
      )
      .order("started_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Failed to load recent trips:", error);
      throw error;
    }

    setRecentTrips((data ?? []) as RecentTrip[]);
  }, []);

  const loadAll = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        await Promise.all([fetchQueue(), fetchRecentTrips()]);
      } catch (error) {
        console.error("Queue load error:", error);
      } finally {
        setLoading(false);
      }
    },
    [fetchQueue, fetchRecentTrips],
  );

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("dispatcher-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          fetchQueue();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trips",
        },
        () => {
          fetchRecentTrips();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll, fetchQueue, fetchRecentTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadAll(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const handleDispatch = useCallback(
    (item: QueueJeepney) => {
      if (!user?.uid) {
        Alert.alert("Error", "You are not authenticated.");
        return;
      }

      Alert.alert(
        "Dispatch Jeepney",
        `Dispatch ${item.plate_number} on ${routeForTerminal(
          item.terminal_id,
        )}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Dispatch",
            onPress: async () => {
              setDispatchingId(item.id);

              try {
                await DispatchService.dispatchJeepney(item.id, user.uid);

                await loadAll(false);
              } catch (error: any) {
                console.error("Dispatch error:", error);

                Alert.alert(
                  "Dispatch Failed",
                  error?.message || "Unable to dispatch jeepney.",
                );
              } finally {
                setDispatchingId(null);
              }
            },
          },
        ],
      );
    },
    [user?.uid, loadAll],
  );

  const filteredJeepneys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return jeepneys;
    }

    return jeepneys.filter((item) => {
      return (
        item.plate_number?.toLowerCase().includes(query) ||
        item.driver_name?.toLowerCase().includes(query) ||
        item.jeep_name?.toLowerCase().includes(query) ||
        terminalName(item.terminal_id).toLowerCase().includes(query)
      );
    });
  }, [jeepneys, searchQuery]);

  const sections = useMemo<QueueSection[]>(() => {
    const map = new Map<number, QueueJeepney[]>();

    filteredJeepneys.forEach((item) => {
      if (!map.has(item.terminal_id)) {
        map.set(item.terminal_id, []);
      }

      map.get(item.terminal_id)!.push(item);
    });

    return Array.from(map.entries()).map(([terminalId, data]) => ({
      title: terminalName(terminalId),
      terminalId,
      data,
    }));
  }, [filteredJeepneys]);

  const waitingCount = jeepneys.filter(
    (item) => item.status === "waiting",
  ).length;

  const loadingCount = jeepneys.filter(
    (item) => item.status === "loading",
  ).length;

  if (loading && !jeepneys.length) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? "#0F172A" : "#EEF8FF",
        }}
      >
        <ActivityIndicator size="large" color="#0EA5E9" />

        <Text
          style={{
            marginTop: 12,
            color: isDark ? "#CBD5E1" : "#475569",
            fontWeight: "800",
          }}
        >
          Loading queue...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#0F172A" : "#EEF8FF",
      }}
    >
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0EA5E9"
          />
        }
        contentContainerStyle={{
          paddingBottom: 30,
        }}
        ListHeaderComponent={
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: 16,
              paddingBottom: 8,
            }}
          >
            <Text
              style={{
                color: isDark ? "#F8FAFC" : "#0F172A",
                fontSize: 24,
                fontWeight: "900",
              }}
            >
              Queue Management
            </Text>

            <Text
              style={{
                marginTop: 4,
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: 11,
              }}
            >
              Monitor and dispatch queued jeepneys.
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 13,
              }}
            >
              <View
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#172033" : "#FFFFFF",
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#64748B" : "#94A3B8",
                    fontSize: 9,
                    fontWeight: "900",
                  }}
                >
                  WAITING
                </Text>

                <Text
                  style={{
                    marginTop: 3,
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  {waitingCount}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#172033" : "#FFFFFF",
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#64748B" : "#94A3B8",
                    fontSize: 9,
                    fontWeight: "900",
                  }}
                >
                  LOADING
                </Text>

                <Text
                  style={{
                    marginTop: 3,
                    color: isDark ? "#F8FAFC" : "#0F172A",
                    fontSize: 20,
                    fontWeight: "900",
                  }}
                >
                  {loadingCount}
                </Text>
              </View>
            </View>

            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 13,
                minHeight: 48,
                borderRadius: 18,
                backgroundColor: isDark ? "#172033" : "#FFFFFF",
                borderWidth: 1,
                borderColor: isDark ? "#263449" : "#D9EAF4",
              }}
            >
              <Search size={18} color="#64748B" />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search plate, driver, terminal..."
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  marginLeft: 9,
                  color: isDark ? "#F8FAFC" : "#0F172A",
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <TerminalNotifyButton terminalId={1} isDark={isDark} />

              <TerminalNotifyButton terminalId={2} isDark={isDark} />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: 13,
              paddingBottom: 4,
            }}
          >
            <Text
              style={{
                color: isDark ? "#F8FAFC" : "#0F172A",
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              {section.title} Terminal
            </Text>

            <Text
              style={{
                marginTop: 2,
                color: isDark ? "#64748B" : "#94A3B8",
                fontSize: 10,
              }}
            >
              {routeForTerminal(section.terminalId)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <QueueItemCard
            item={item}
            now={now}
            dispatching={dispatchingId === item.id}
            onDispatch={() => handleDispatch(item)}
            isDark={isDark}
          />
        )}
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              paddingHorizontal: 30,
              paddingTop: 50,
            }}
          >
            <Text
              style={{
                color: isDark ? "#F8FAFC" : "#0F172A",
                fontSize: 17,
                fontWeight: "900",
              }}
            >
              No jeepneys found
            </Text>

            <Text
              style={{
                marginTop: 5,
                color: isDark ? "#94A3B8" : "#64748B",
                fontSize: 11,
                textAlign: "center",
              }}
            >
              There are currently no queued jeepneys matching your search.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 15 }}>
            <Text
              style={{
                marginHorizontal: 14,
                marginBottom: 7,
                color: isDark ? "#F8FAFC" : "#0F172A",
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              Recent Trips
            </Text>

            {recentTrips.map((trip) => (
              <RecentTripRow key={trip.id} trip={trip} isDark={isDark} />
            ))}
          </View>
        }
      />
    </View>
  );
}
