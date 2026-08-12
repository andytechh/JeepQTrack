// app/staff/(admin)/(tabs)/jeepneys.tsx
import { router } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  AdminService,
  Jeepney,
} from "../../../../src/shared/services/AdminService";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting" },
  { key: "queued", label: "Queued" },
  { key: "in_transit", label: "In transit" },
  { key: "maintenance", label: "Maintenance" },
];

const statusColorMap = {
  waiting: "#f59e0b",
  queued: "#0ea5e9",
  dispatched: "#8b5cf6",
  in_transit: "#22c55e",
  maintenance: "#ef4444",
  inactive: "#64748b",
};

export default function JeepneysScreen() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jeepneys, setJeepneys] = useState<Jeepney[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Jeepney["status"] | "all">(
    "all",
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminService.getJeepneys({
        search,
        status: statusFilter,
      });
      setJeepneys(data);
    } catch (err) {
      console.error("Failed to load jeepneys", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <View className="px-4 pt-3">
        <View
          className={`flex-row items-center px-3 py-2.5 rounded-xl border ${
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <Search size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
          <TextInput
            className={`flex-1 text-base ml-2 ${isDark ? "text-white" : "text-slate-900"}`}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load()}
            placeholder="Search plate number"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 12 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-full ${
                statusFilter === f.key
                  ? "bg-sky-500"
                  : isDark
                    ? "bg-slate-800"
                    : "bg-white"
              }`}
            >
              <Text
                className={`text-xs font-medium ${statusFilter === f.key ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && jeepneys.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={jeepneys}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/staff/(admin)/jeepneys/${item.id}`)}
              className={`p-4 rounded-xl mb-3 flex-row items-center justify-between ${
                isDark ? "bg-slate-800" : "bg-white"
              } border ${isDark ? "border-slate-700" : "border-slate-200"}`}
            >
              <View className="flex-1">
                <Text
                  className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {item.plate_number}
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  Bracket {item.bracket} • {item.current_occupancy ?? 0}/
                  {item.capacity}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                  backgroundColor:
                    (statusColorMap[item.status] || "#64748b") + "20",
                }}
              >
                <Text
                  style={{
                    color: statusColorMap[item.status] || "#94a3b8",
                    fontSize: 11,
                  }}
                >
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#0ea5e9"
            />
          }
          ListEmptyComponent={
            <View className="py-8">
              <Text
                className={`text-center ${isDark ? "text-slate-400" : "text-slate-400"}`}
              >
                No jeepneys found.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        onPress={() => router.push("/staff/(admin)/jeepneys/new")}
        className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/40"
      >
        <Plus size={26} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
