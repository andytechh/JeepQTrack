import { JeepneyCard } from "@/src/shared/components/ui/JeepneyCard";
import { useJeepneyQueue } from "@/src/shared/hooks/useJeepneyQueue";
import { useRouter } from "expo-router";
import { ArrowLeft, Bus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TERMINAL_NAMES: Record<number, string> = {
  1: "Donsol",
  2: "Daraga",
};

export default function QueueScreen() {
  const router = useRouter();
  const { data, loading, error, lastUpdate, refetch } = useJeepneyQueue();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [terminalFilter, setTerminalFilter] = useState<number | "all">("all");

  // Find the first loading jeepney to highlight as hero
  const loadingJeepneys = useMemo(
    () => data.filter((j) => j.status === "loading"),
    [data],
  );
  const currentLoading = loadingJeepneys.length > 0 ? loadingJeepneys[0] : null;

  // All other jeepneys (waiting + any extra loading after the first)
  const restQueue = useMemo(
    () => data.filter((j) => j.id !== currentLoading?.id),
    [data, currentLoading],
  );

  // Apply search + terminal filter to the rest (hero is always shown if exists)
  const visibleRest = useMemo(() => {
    return restQueue.filter((item) => {
      const matchesTerminal =
        terminalFilter === "all" || item.terminal_id === terminalFilter;
      const matchesSearch =
        item.plate_number?.toLowerCase().includes(query.toLowerCase()) ||
        item.driver_name?.toLowerCase().includes(query.toLowerCase());
      return matchesTerminal && matchesSearch;
    });
  }, [restQueue, query, terminalFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Jeepney Queue</Text>
        <Text style={styles.updateText}>
          Updated {lastUpdate ? lastUpdate.toLocaleTimeString() : "just now"}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search plate number or driver"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Terminal toggle (All / Donsol / Daraga) */}
      <View style={styles.toggleGroup}>
        {(["all", 1, 2] as const).map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.toggleItem,
              terminalFilter === value && styles.toggleItemActive,
            ]}
            onPress={() => setTerminalFilter(value)}
          >
            <Text
              style={[
                styles.toggleText,
                terminalFilter === value && styles.toggleTextActive,
              ]}
            >
              {value === "all" ? "All Terminals" : TERMINAL_NAMES[value]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main content */}
      {loading && !data.length ? (
        <View style={styles.centered}>
          <Text>Loading queue...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={{ color: "red" }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleRest}
          renderItem={({ item }) => <JeepneyCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <View>
              {/* Hero card for currently loading jeepney */}
              {currentLoading ? (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.sectionTitle}>⭐ Currently Loading</Text>
                  <JeepneyCard item={currentLoading} isCurrent />
                </View>
              ) : (
                <View style={styles.centered}>
                  <Text style={{ color: "#94a3b8", marginBottom: 16 }}>
                    No jeepney is loading at the moment.
                  </Text>
                </View>
              )}

              {/* Summary of remaining queue */}
              <View style={styles.listSummaryRow}>
                <Text style={styles.listSummary}>
                  {visibleRest.length} jeepney
                  {visibleRest.length !== 1 ? "s" : ""} in queue
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Bus size={48} color="#cbd5e1" />
              <Text style={{ marginTop: 12, fontSize: 16, color: "#94a3b8" }}>
                No jeepneys match your filters
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: "bold", color: "#0f172a", flex: 1 },
  updateText: { fontSize: 12, color: "#64748b" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 16, color: "#0f172a" },
  toggleGroup: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  toggleItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  toggleItemActive: { backgroundColor: "#0ea5e9" },
  toggleText: { fontSize: 13, color: "#334155" },
  toggleTextActive: { color: "#ffffff", fontWeight: "600" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  listSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  listSummary: { fontSize: 13, color: "#64748b" },
  centered: { paddingVertical: 40, alignItems: "center" },
});
