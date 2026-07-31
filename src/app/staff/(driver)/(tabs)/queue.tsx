// app/staff/(driver)/queue.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Bus,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  Users
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../src/shared/config/supabase";
import { useAuthStore } from "../../../../src/shared/store/authStore";

// ─── TYPES ──────────────────────────────────────────────────────────
interface QueueItem {
  id: string;
  plate_number: string;
  bracket: number;
  status: string;
  queue_position: number;
  terminal_id: number;
  current_occupancy: number;
  capacity: number;
  driver_name: string;
  loading_started_at: string | null;
  loading_ends_at: string | null;
}

interface Terminal {
  id: number;
  name: string;
  location: string;
}

const TERMINALS: Terminal[] = [
  { id: 1, name: "Donsol Terminal", location: "Donsol, Sorsogon" },
  { id: 2, name: "Daraga Terminal", location: "Daraga, Albay" },
];

// ─── CACHE ──────────────────────────────────────────────────────────
const queueCache = new Map<number, { data: QueueItem[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

export default function QueueScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<number>(1);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // ─── FETCH QUEUE ──────────────────────────────────────────────────
  const fetchQueue = useCallback(
    async (forceRefresh = false) => {
      try {
        // Check cache first
        const cached = queueCache.get(selectedTerminal);
        const now = Date.now();

        if (
          !forceRefresh &&
          cached &&
          now - cached.timestamp < CACHE_DURATION
        ) {
          console.log(
            "📦 Using cached queue data for terminal:",
            selectedTerminal,
          );
          setQueueItems(cached.data);
          setLastUpdate(new Date(cached.timestamp).toISOString());
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        console.log("📊 Fetching queue for terminal:", selectedTerminal);

        const { data, error: fetchError } = await supabase
          .from("jeepneys")
          .select(
            `
          id,
          plate_number,
          bracket,
          status,
          queue_position,
          terminal_id,
          current_occupancy,
          capacity,
          driver_name,
          loading_started_at,
          loading_ends_at
        `,
          )
          .eq("terminal_id", selectedTerminal)
          .in("status", ["waiting", "loading"])
          .order("bracket", { ascending: true })
          .order("queue_position", { ascending: true, nullsLast: true });

        if (fetchError) throw fetchError;

        const items = data || [];
        console.log("✅ Queue data:", items.length, "items");

        // Update cache
        queueCache.set(selectedTerminal, { data: items, timestamp: now });

        setQueueItems(items);
        setLastUpdate(new Date().toISOString());
      } catch (err: any) {
        console.error("❌ Queue fetch error:", err);
        setError(err.message || "Failed to fetch queue");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedTerminal],
  );

  // ─── FETCH ON FOCUS ───────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      console.log("👁️ Queue screen focused - fetching data");
      fetchQueue(); // Uses cache if available
      subscribeToQueue();

      return () => {
        console.log("🔌 Queue screen unfocused - unsubscribing");
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
      };
    }, [fetchQueue]),
  );

  // ─── REALTIME SUBSCRIPTION ────────────────────────────────────────
  const subscribeToQueue = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    console.log("🔔 Subscribing to queue for terminal:", selectedTerminal);

    const channel = supabase
      .channel(`queue_terminal_${selectedTerminal}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
          filter: `terminal_id=eq.${selectedTerminal}`,
        },
        (payload) => {
          console.log("🔄 Queue realtime update:", payload.eventType);
          fetchQueue(true); // Force refresh on realtime update
        },
      )
      .subscribe((status) => {
        console.log("📡 Queue subscription status:", status);
      });

    channelRef.current = channel;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQueue(true); // Force refresh
  };

  const handleTerminalChange = (terminalId: number) => {
    setSelectedTerminal(terminalId);
    // fetchQueue will be called by useFocusEffect dependency
  };

  // ─── HELPERS ──────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case "loading":
        return "#22c55e";
      case "waiting":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  };

  const getEstimatedWaitTime = (position: number) => {
    return position * 30;
  };

  const getTimeRemaining = (endsAt: string | null) => {
    if (!endsAt) return null;
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    const minutes = Math.floor(diff / 60000);
    if (minutes > 0) return `${minutes}m remaining`;
    return "Finishing...";
  };

  // ─── RENDER ──────────────────────────────────────────────────────
  const renderQueueItem = ({
    item,
    index,
  }: {
    item: QueueItem;
    index: number;
  }) => {
    const statusColor = getStatusColor(item.status);
    const isFirst = index === 0 && item.status === "loading";

    return (
      <View
        style={{
          backgroundColor: isFirst
            ? "rgba(34,197,94,0.1)"
            : "rgba(15,23,42,0.8)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 10,
          borderWidth: isFirst ? 2 : 1,
          borderColor: isFirst ? "#22c55e" : "rgba(255,255,255,0.05)",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isFirst
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(14,165,233,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "bold", color: statusColor }}
              >
                #{item.queue_position || "?"}
              </Text>
            </View>
            <View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                >
                  {item.plate_number || "Unknown"}
                </Text>
                <View
                  style={{
                    backgroundColor: `${statusColor}20`,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {item.status === "loading" ? "Loading" : "Waiting"}
                  </Text>
                </View>
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                Bracket {item.bracket || 1} • {item.driver_name || "No Driver"}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#64748b" />
        </View>

        <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Users size={14} color="#64748b" />
            <Text style={{ color: "#94a3b8", fontSize: 12 }}>
              {item.current_occupancy || 0}/{item.capacity || 24}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Clock size={14} color="#64748b" />
            <Text style={{ color: "#94a3b8", fontSize: 12 }}>
              {item.status === "loading"
                ? `Loading ${getTimeRemaining(item.loading_ends_at) || ""}`
                : `ETA ~${getEstimatedWaitTime(item.queue_position || 0)} min`}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={14} color="#64748b" />
            <Text style={{ color: "#94a3b8", fontSize: 12 }}>
              {item.terminal_id === 1 ? "Donsol" : "Daraga"}
            </Text>
          </View>
        </View>

        {isFirst && (
          <View
            style={{
              marginTop: 8,
              backgroundColor: "rgba(34,197,94,0.15)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#4ade80", fontSize: 10, fontWeight: "600" }}>
              ⭐ Currently Loading
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && queueItems.length === 0) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#0a1628",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: "#94a3b8", marginTop: 12 }}>
          Loading queue...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a1628" }}>
      <LinearGradient
        colors={["#0c4a6e", "#0a1628"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 100,
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              color: "white",
              fontSize: 20,
              fontWeight: "bold",
              marginLeft: 12,
            }}
          >
            Queue
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                backgroundColor: "rgba(14,165,233,0.15)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(14,165,233,0.2)",
              }}
            >
              <Text
                style={{ color: "#38bdf8", fontSize: 12, fontWeight: "600" }}
              >
                {queueItems.filter((q) => q.status === "loading").length}{" "}
                Loading
              </Text>
            </View>
            <TouchableOpacity onPress={handleRefresh}>
              <RefreshCw size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Terminal Selector */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          {TERMINALS.map((terminal) => (
            <TouchableOpacity
              key={terminal.id}
              style={{
                flex: 1,
                backgroundColor:
                  selectedTerminal === terminal.id
                    ? "rgba(14,165,233,0.2)"
                    : "rgba(255,255,255,0.05)",
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor:
                  selectedTerminal === terminal.id
                    ? "rgba(14,165,233,0.3)"
                    : "rgba(255,255,255,0.05)",
                alignItems: "center",
              }}
              onPress={() => handleTerminalChange(terminal.id)}
            >
              <Text
                style={{
                  color:
                    selectedTerminal === terminal.id ? "#38bdf8" : "#94a3b8",
                  fontWeight: "600",
                }}
              >
                {terminal.name.split(" ")[0]}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 10 }}>
                {queueItems.filter((q) => q.terminal_id === terminal.id).length}{" "}
                jeepneys
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={queueItems}
        renderItem={renderQueueItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0ea5e9"
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Bus size={48} color="#334155" />
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "600",
                marginTop: 16,
              }}
            >
              Queue is Empty
            </Text>
            <Text
              style={{
                color: "#64748b",
                fontSize: 14,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              No jeepneys waiting or loading at this terminal.
            </Text>
          </View>
        }
        ListHeaderComponent={
          queueItems.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 4,
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.05)",
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                {queueItems.length} jeepney{queueItems.length > 1 ? "s" : ""} in
                queue
              </Text>
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                Updated{" "}
                {lastUpdate
                  ? new Date(lastUpdate).toLocaleTimeString()
                  : "just now"}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
