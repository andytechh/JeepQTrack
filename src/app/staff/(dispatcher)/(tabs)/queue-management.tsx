import { useFocusEffect } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  MapPin,
  Play,
  SkipForward,
  Users
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../src/shared/config/supabase";

const TERMINALS = [
  { id: 1, name: "Donsol Terminal" },
  { id: 2, name: "Daraga Terminal" },
];

export default function QueueManagementScreen() {
  const [selectedTerminal, setSelectedTerminal] = useState(1);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from("jeepneys")
      .select("*")
      .eq("terminal_id", selectedTerminal)
      .in("status", ["waiting", "loading"])
      .order("queue_position", { ascending: true });

    if (data) setQueueItems(data);
  }, [selectedTerminal]);

  useFocusEffect(
    useCallback(() => {
      fetchQueue();
    }, [fetchQueue]),
  );

  const moveUp = async (id: string, currentPos: number) => {
    if (currentPos <= 1) return;
    const above = queueItems.find((q) => q.queue_position === currentPos - 1);
    if (!above) return;

    await supabase
      .from("jeepneys")
      .update({ queue_position: currentPos - 1 })
      .eq("id", id);
    await supabase
      .from("jeepneys")
      .update({ queue_position: currentPos })
      .eq("id", above.id);
    fetchQueue();
  };

  const moveDown = async (id: string, currentPos: number) => {
    if (currentPos >= queueItems.length) return;
    const below = queueItems.find((q) => q.queue_position === currentPos + 1);
    if (!below) return;

    await supabase
      .from("jeepneys")
      .update({ queue_position: currentPos + 1 })
      .eq("id", id);
    await supabase
      .from("jeepneys")
      .update({ queue_position: currentPos })
      .eq("id", below.id);
    fetchQueue();
  };

  const startLoading = async (id: string) => {
    Alert.alert("Start Loading", "Assign this jeepney to loading?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start",
        onPress: async () => {
          await supabase
            .from("jeepneys")
            .update({
              status: "loading",
              loading_started_at: new Date().toISOString(),
              loading_ends_at: new Date(Date.now() + 30 * 60000).toISOString(),
            })
            .eq("id", id);
          fetchQueue();
        },
      },
    ]);
  };

  const skipJeepney = async (id: string) => {
    Alert.alert("Skip", "Move this jeepney to end of queue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        onPress: async () => {
          const maxPos = queueItems.length;
          await supabase
            .from("jeepneys")
            .update({ queue_position: maxPos + 1 })
            .eq("id", id);
          fetchQueue();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#0a1628]">
      {/* Terminal Selector */}
      <View className="flex-row gap-2 p-4">
        {TERMINALS.map((t) => (
          <TouchableOpacity
            key={t.id}
            className={`flex-1 py-3 rounded-xl items-center border ${selectedTerminal === t.id ? "bg-sky-500/20 border-sky-500/30" : "bg-white/5 border-white/5"}`}
            onPress={() => setSelectedTerminal(t.id)}
          >
            <Text
              className={`font-semibold ${selectedTerminal === t.id ? "text-sky-400" : "text-white/60"}`}
            >
              {t.name.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={queueItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchQueue();
              setRefreshing(false);
            }}
          />
        }
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Clock size={48} color="#475569" />
            <Text className="text-white/50 mt-4">Queue is empty</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            className={`mb-3 rounded-xl p-4 border ${item.status === "loading" ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/5"}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-sky-500/20 items-center justify-center">
                  <Text className="text-sky-400 font-bold">
                    #{item.queue_position || "?"}
                  </Text>
                </View>
                <View>
                  <Text className="text-white font-bold">
                    {item.plate_number || "Unknown"}
                  </Text>
                  <Text className="text-white/40 text-xs">
                    {item.driver_name || "No driver"} • Bracket {item.bracket}
                  </Text>
                </View>
              </View>
              <View
                className={`px-3 py-1 rounded-lg ${item.status === "loading" ? "bg-green-500/20" : "bg-yellow-500/20"}`}
              >
                <Text
                  className={`text-xs font-bold ${item.status === "loading" ? "text-green-400" : "text-yellow-400"}`}
                >
                  {item.status === "loading" ? "Loading" : "Waiting"}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4 mt-3">
              <View className="flex-row items-center gap-1">
                <Users size={12} color="#94a3b8" />
                <Text className="text-white/40 text-xs">
                  {item.current_occupancy || 0}/{item.capacity || 24}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <MapPin size={12} color="#94a3b8" />
                <Text className="text-white/40 text-xs">
                  {item.terminal_id === 1 ? "Donsol" : "Daraga"}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-white/5">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-white/5 rounded-lg"
                onPress={() => moveUp(item.id, item.queue_position)}
              >
                <ArrowUp size={14} color="#94a3b8" />
                <Text className="text-white/60 text-xs">Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-white/5 rounded-lg"
                onPress={() => moveDown(item.id, item.queue_position)}
              >
                <ArrowDown size={14} color="#94a3b8" />
                <Text className="text-white/60 text-xs">Down</Text>
              </TouchableOpacity>
              {item.status === "waiting" && (
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-green-500/20 rounded-lg"
                  onPress={() => startLoading(item.id)}
                >
                  <Play size={14} color="#22c55e" />
                  <Text className="text-green-400 text-xs">Load</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-red-500/10 rounded-lg"
                onPress={() => skipJeepney(item.id)}
              >
                <SkipForward size={14} color="#ef4444" />
                <Text className="text-red-400 text-xs">Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
