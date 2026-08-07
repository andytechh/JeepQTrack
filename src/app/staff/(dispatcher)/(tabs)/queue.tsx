// app/staff/(dispatcher)/queue.tsx
import { router } from "expo-router";
import { ArrowLeft, Bus, Search, X } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Card } from "../../../../src/shared/components/ui/Card";
import { StatusPill } from "../../../../src/shared/components/ui/StatusPill";
import { useTheme } from "../../../../src/shared/context/ThemeContext";

// ─── MOCK DATA ──────────────────────────────────────────────────────
interface QueueItem {
  id: string;
  plateNumber: string;
  driverName: string;
  terminal: string;
  status: "waiting" | "loading" | "dispatched";
  queuePosition: number;
  timestamp: string;
}

const mockQueue: QueueItem[] = [
  {
    id: "1",
    plateNumber: "ABC-1234",
    driverName: "Juan Dela Cruz",
    terminal: "Daraga",
    status: "waiting",
    queuePosition: 1,
    timestamp: "2 min ago",
  },
  {
    id: "2",
    plateNumber: "XYZ-5678",
    driverName: "Maria Santos",
    terminal: "Daraga",
    status: "loading",
    queuePosition: 2,
    timestamp: "5 min ago",
  },
  {
    id: "3",
    plateNumber: "DEF-9012",
    driverName: "Pedro Reyes",
    terminal: "Daraga",
    status: "waiting",
    queuePosition: 3,
    timestamp: "12 min ago",
  },
  {
    id: "4",
    plateNumber: "GHI-3456",
    driverName: "Ana Lopez",
    terminal: "Daraga",
    status: "dispatched",
    queuePosition: 4,
    timestamp: "25 min ago",
  },
];

export default function DispatcherQueueScreen() {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>(mockQueue);

  const filteredQueue = queue.filter(
    (item) =>
      item.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDispatch = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id && item.status === "waiting"
          ? { ...item, status: "loading" }
          : item,
      ),
    );
  };

  const handleComplete = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id && item.status === "loading"
          ? { ...item, status: "dispatched" }
          : item,
      ),
    );
  };

  const renderItem = ({ item }: { item: QueueItem }) => {
    const isWaiting = item.status === "waiting";
    const isLoading = item.status === "loading";
    const isDispatched = item.status === "dispatched";

    return (
      <Card className="mb-3 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                isWaiting
                  ? isDark
                    ? "bg-yellow-500/20"
                    : "bg-yellow-50"
                  : isLoading
                    ? isDark
                      ? "bg-blue-500/20"
                      : "bg-blue-50"
                    : isDark
                      ? "bg-green-500/20"
                      : "bg-green-50"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isWaiting
                    ? "text-yellow-600"
                    : isLoading
                      ? "text-blue-600"
                      : "text-green-600"
                }`}
              >
                {item.queuePosition}
              </Text>
            </View>
            <View className="flex-1">
              <Text
                className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {item.plateNumber}
              </Text>
              <Text
                className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                {item.driverName} · {item.terminal}
              </Text>
              <Text
                className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                {item.timestamp}
              </Text>
            </View>
          </View>
          <View className="items-end gap-1.5">
            <StatusPill status={item.status} dot isDark={isDark} />
            {isWaiting && (
              <TouchableOpacity
                className="bg-sky-500 rounded-full px-3 py-1"
                onPress={() => handleDispatch(item.id)}
              >
                <Text className="text-white text-xs font-medium">Dispatch</Text>
              </TouchableOpacity>
            )}
            {isLoading && (
              <TouchableOpacity
                className="bg-green-500 rounded-full px-3 py-1"
                onPress={() => handleComplete(item.id)}
              >
                <Text className="text-white text-xs font-medium">Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
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
          className={`text-xl font-bold flex-1 ${isDark ? "text-white" : "text-slate-900"}`}
        >
          Queue Management
        </Text>
      </View>

      {/* Search */}
      <View
        className={`flex-row items-center mx-4 mt-4 mb-3 px-3 py-2.5 rounded-xl border ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <Search size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
        <TextInput
          className={`flex-1 text-base ml-2 ${isDark ? "text-white" : "text-slate-900"}`}
          placeholder="Search by plate or driver..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row justify-around mx-4 mb-3">
        <View className="items-center">
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {queue.filter((q) => q.status === "waiting").length}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Waiting
          </Text>
        </View>
        <View className="items-center">
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {queue.filter((q) => q.status === "loading").length}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Loading
          </Text>
        </View>
        <View className="items-center">
          <Text
            className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {queue.filter((q) => q.status === "dispatched").length}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            Dispatched
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredQueue}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Bus size={48} color={isDark ? "#475569" : "#cbd5e1"} />
            <Text
              className={`mt-3 text-base ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              No jeepneys in queue
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
