// src/shared/components/QueueView.tsx
import { useJeepneyQueue } from "@/src/shared/hooks/useJeepneyQueue";
import { ArrowLeft, Bus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { JeepneyCard } from "../ui/JeepneyCard";

interface QueueViewProps {
  onBack?: () => void; // staff app uses this; commuter can omit
  title?: string;
}

const TERMINAL_NAMES: Record<number, string> = { 1: "Donsol", 2: "Daraga" };

export function QueueView({ onBack, title = "Jeepney Queue" }: QueueViewProps) {
  const { data, loading, error, lastUpdate, refetch } = useJeepneyQueue();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [terminalFilter, setTerminalFilter] = useState<number | "all">("all");

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
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {onBack && (
          <TouchableOpacity onPress={onBack} className="mr-3 p-1">
            <ArrowLeft size={24} color="#0f172a" className="dark:text-white" />
          </TouchableOpacity>
        )}
        <Text className="text-xl font-bold text-slate-900 dark:text-white flex-1">
          {title}
        </Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          Updated {lastUpdate ? lastUpdate.toLocaleTimeString() : "just now"}
        </Text>
      </View>

      {/* Search */}
      <View className="flex-row items-center mx-4 mt-4 mb-2 px-3 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <Search size={18} color="#94a3b8" className="mr-2" />
        <TextInput
          className="flex-1 text-base text-slate-900 dark:text-white"
          placeholder="Search plate number or driver"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Terminal toggle */}
      <View className="flex-row mx-4 mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {(["all", 1, 2] as const).map((value) => (
          <TouchableOpacity
            key={value}
            className={`flex-1 py-2 items-center ${
              terminalFilter === value
                ? "bg-sky-500 dark:bg-sky-600"
                : "bg-white dark:bg-slate-800"
            }`}
            onPress={() => setTerminalFilter(value)}
          >
            <Text
              className={`text-sm ${
                terminalFilter === value
                  ? "text-white font-semibold"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {value === "all" ? "All" : TERMINAL_NAMES[value]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading && data.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500 dark:text-slate-400">
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <View className="mb-4 mt-2">
              {heroItem ? (
                <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  ⭐ Currently Loading
                </Text>
              ) : filteredQueue.length > 0 ? (
                <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  Queue
                </Text>
              ) : null}
              <Text className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {filteredQueue.length} jeepney
                {filteredQueue.length !== 1 ? "s" : ""} matching
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-10">
              <Bus size={48} color="#cbd5e1" />
              <Text className="mt-3 text-base text-slate-400 dark:text-slate-500">
                No jeepneys match your filters
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
