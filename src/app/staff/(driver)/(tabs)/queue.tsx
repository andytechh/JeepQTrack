// app/staff/(driver)/queue.tsx
import { JeepneyCard } from "@/src/shared/components/ui/JeepneyCard";
import { useJeepneyQueue } from "@/src/shared/hooks/useJeepneyQueue";
import { useRouter } from "expo-router";
import { ArrowLeft, Bus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../../../src/shared/context/ThemeContext";

const TERMINAL_NAMES: Record<number, string> = { 1: "Donsol", 2: "Daraga" };

export default function QueueScreen() {
  const router = useRouter();
  const { data, loading, error, lastUpdate, refetch } = useJeepneyQueue();
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [terminalFilter, setTerminalFilter] = useState<number | "all">("all");

  // Unified filtering and sorting
  const filteredQueue = useMemo(() => {
    const filtered = data.filter((item) => {
      const matchesTerminal =
        terminalFilter === "all" || item.terminal_id === terminalFilter;
      const q = query.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.plate_number?.toLowerCase().includes(q) ||
        item.driver_name?.toLowerCase().includes(q);
      return matchesTerminal && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (a.status === "loading" && b.status !== "loading") return -1;
      if (b.status === "loading" && a.status !== "loading") return 1;
      return (a.queue_position || 999) - (b.queue_position || 999);
    });
  }, [data, query, terminalFilter]);

  const heroItem =
    filteredQueue.length > 0 && filteredQueue[0].status === "loading"
      ? filteredQueue[0]
      : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      {/* Header */}
      <View
        className={`flex-row items-center px-4 py-3 border-b ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color={isDark ? "#94a3b8" : "#0f172a"} />
        </TouchableOpacity>
        <Text
          className={`text-xl font-bold flex-1 ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Jeepney Queue
        </Text>
        <Text
          className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          Updated {lastUpdate ? lastUpdate.toLocaleTimeString() : "just now"}
        </Text>
      </View>

      {/* Search */}
      <View
        className={`flex-row items-center mx-4 mt-4 mb-2 px-3 py-2.5 rounded-xl border ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <Search size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
        <TextInput
          className={`flex-1 text-base ${isDark ? "text-white" : "text-slate-900"}`}
          placeholder="Search plate number or driver"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>

      {/* Terminal toggle */}
      <View
        className={`flex-row mx-4 mb-3 rounded-xl overflow-hidden border ${
          isDark ? "border-slate-700" : "border-slate-200"
        }`}
      >
        {(["all", 1, 2] as const).map((value) => (
          <TouchableOpacity
            key={value}
            className={`flex-1 py-2 items-center ${
              terminalFilter === value
                ? "bg-sky-500"
                : isDark
                  ? "bg-slate-800"
                  : "bg-white"
            }`}
            onPress={() => setTerminalFilter(value)}
          >
            <Text
              className={`text-sm ${
                terminalFilter === value
                  ? "text-white font-semibold"
                  : isDark
                    ? "text-slate-300"
                    : "text-slate-700"
              }`}
            >
              {value === "all" ? "All" : TERMINAL_NAMES[value]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main list */}
      {loading && data.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className={isDark ? "text-slate-400" : "text-slate-500"}>
            Loading queue...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredQueue}
          renderItem={({ item, index }) => (
            <JeepneyCard
              item={item}
              isCurrent={index === 0 && item.status === "loading"}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <View className="mb-4">
              {heroItem ? (
                <Text
                  className={`text-base font-semibold mb-1 text-lg ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Currently Loading
                </Text>
              ) : filteredQueue.length > 0 ? (
                <Text
                  className={`text-base font-semibold mb-1 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Queue
                </Text>
              ) : null}
              <Text
                className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"} mb-2`}
              >
                {filteredQueue.length} jeepney
                {filteredQueue.length !== 1 ? "s" : ""} matching
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-10">
              <Bus size={48} color={isDark ? "#475569" : "#cbd5e1"} />
              <Text
                className={`mt-3 text-base ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                No jeepneys match your filters
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
