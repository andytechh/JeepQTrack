// app/staff/(dispatcher)/index.tsx - Updated with GPS navigation

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Eye, MapPin } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "../../../src/shared/components";
import { supabase } from "../../../src/shared/config/supabase";
import { useAuthStore } from "../../../src/shared/store/authStore";

// ─── CARD COMPONENT ──────────────────────────────────────────────────
const Card = ({ children, className = "" }: any) => (
  <View
    className={`bg-[#1e293b] rounded-xl ${className}`}
    style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}
  >
    {children}
  </View>
);

export default function DispatcherIndex() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch recent / active trips
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .or("arrival_time.is.null,status.eq.waiting")
        .order("departure_time", { ascending: false })
        .limit(100);

      if (tripsError) {
        console.error("Failed to fetch trips:", tripsError);
      }

      // Fetch drivers (users with role = driver)
      const { data: driversData, error: driversError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver")
        .order("display_name", { ascending: true });

      if (driversError) {
        console.error("Failed to fetch drivers:", driversError);
      }

      // Normalize trips for UI
      const normalizedTrips = (tripsData || []).map((t: any) => ({
        id: t.id,
        route: t.route || t.name || "Route",
        passengerCount: t.total_passengers || 0,
        status: t.status
          ? String(t.status)
          : t.arrival_time
            ? "Completed"
            : "In Progress",
        eta: t.eta || t.estimated_arrival || null,
        driver: t.driver_id || t.driver_name || null,
        raw: t,
      }));

      // Normalize drivers for UI
      const normalizedDrivers = (driversData || []).map((d: any) => {
        const lastSeen =
          d.last_seen ||
          d.last_location_update ||
          d.updated_at ||
          d.last_active ||
          null;
        let statusLabel = "Offline";
        if (lastSeen) {
          try {
            const diffMs = Date.now() - new Date(lastSeen).getTime();
            if (diffMs < 5 * 60 * 1000) statusLabel = "Online";
            else statusLabel = "Idle";
          } catch (e) {
            statusLabel = d.is_active ? "Online" : "Offline";
          }
        } else {
          statusLabel = d.is_active ? "Online" : "Offline";
        }

        return {
          id: d.id,
          name:
            d.display_name ||
            d.displayName ||
            d.name ||
            d.full_name ||
            "Driver",
          status: statusLabel,
          lastSeen: lastSeen,
          jeepneyId: d.jeepney_id || d.jeepneyId || null,
          raw: d,
        };
      });

      setTrips(normalizedTrips);
      setDrivers(normalizedDrivers);
    } catch (err) {
      console.error("Dispatcher fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchData();

    // Subscribe to trips table changes
    const tripsChannel = supabase
      .channel("realtime_trips")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        (payload) => {
          console.log("trips change:", payload);
          fetchData();
        },
      )
      .subscribe();

    // Subscribe to users (drivers) changes
    const driversChannel = supabase
      .channel("realtime_drivers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `role=eq.driver`,
        },
        (payload) => {
          console.log("drivers change:", payload);
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(driversChannel);
    };
  }, [fetchData]);

  const activeTripsCount = trips.length;
  const availableDriversCount = drivers.filter(
    (d) => d.status === "Online",
  ).length;
  // Number of online vehicles (jeepneys) - drivers with an associated jeepney and online
  const onlineJeepneysCount = drivers.filter(
    (d) => d.status === "Online" && (d.jeepneyId || d.jeepneyId === 0 || d.jeepneyId === "") ? d.jeepneyId !== null : false,
  ).length;
  const waitingQueueCount = trips.filter((t) =>
    String(t.status).toLowerCase().includes("wait"),
  ).length;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  // ─── Assign Trip Flow ───────────────────────────────────────────
  const openAssignModal = (trip: any) => {
    setSelectedTrip(trip);
    setSelectedDriverId(null);
    setAssignModalVisible(true);
  };

  const confirmAssign = async () => {
    if (!selectedTrip || !selectedDriverId) return;
    setAssigning(true);
    try {
      const driver = drivers.find((d) => d.id === selectedDriverId);
      const { error } = await supabase
        .from("trips")
        .update({
          driver_id: selectedDriverId,
          driver_name: driver?.name || null,
          status: "assigned",
        })
        .eq("id", selectedTrip.id);

      if (error) throw error;
      await fetchData();
      setAssignModalVisible(false);
    } catch (err) {
      console.error("Assign error:", err);
    } finally {
      setAssigning(false);
    }
  };

  // ─── Navigate to GPS Tracking ───────────────────────────────────
  const navigateToGPS = () => {
    router.push("/staff/(driver)/gps-tracking");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-white/60 font-medium">
          Loading dispatcher dashboard...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#0a1628]"
      style={{ paddingTop: insets.top }}
    >
      {/* ─── DRIVER-STYLE HEADER ───────────────────────────── */}
      <LinearGradient
        colors={["#0a1628", "#0c4a6e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 18 }}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-white/50 text-xs">Dispatcher Dashboard</Text>
            <Text className="text-white text-lg font-extrabold">
              {user?.displayName || "Dispatcher"}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <View className="mr-3">
              <Text className="text-white/60 text-xs">Active Trips</Text>
              <Text className="text-white text-base font-extrabold">
                {activeTripsCount}
              </Text>
            </View>
            <View className="mr-3">
              <Text className="text-white/60 text-xs">Available</Text>
              <Text className="text-white text-base font-extrabold">
                {availableDriversCount}
              </Text>
            </View>
            <View>
              <Text className="text-white/60 text-xs">Waiting</Text>
              <Text className="text-white text-base font-extrabold">
                {waitingQueueCount}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0ea5e9"
          />
        }
      >
        {/* ─── GPS TRACKING PLACEHOLDER ────────────────────────────── */}
        <TouchableOpacity onPress={navigateToGPS} activeOpacity={0.9}>
          <Card className="p-4 h-48 items-center justify-center mb-4 relative overflow-hidden">
            {/* Background gradient */}
            <LinearGradient
              colors={["#0c4a6e", "#0a1628"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* Content */}
            <View className="items-center z-10">
              <View className="flex-row items-center gap-2 mb-3">
                <MapPin size={24} color="#38bdf8" />
                <Text className="text-white text-lg font-bold">
                  Live GPS Tracking
                </Text>
              </View>

              <View className="flex-row gap-6 mb-3">
                <View className="items-center">
                  <Text className="text-white/60 text-xs">Active Vehicles</Text>
                  <Text className="text-white text-xl font-bold">
                    {onlineJeepneysCount || 0}
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-white/60 text-xs">Donsol → Daraga</Text>
                  <Text className="text-[#38bdf8] text-xs font-semibold">
                    Real-time route
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mt-1">
                <Eye size={16} color="#94a3b8" />
                <Text className="text-white/40 text-xs">
                  Tap to view live map
                </Text>
              </View>

              {/* Simulated route line */}
              <View className="flex-row items-center gap-2 mt-2">
                <View className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <View className="w-16 h-0.5 bg-[#38bdf8]/50" />
                <View
                  className="w-16 h-0.5 bg-[#38bdf8]/30"
                  style={{ borderStyle: "dashed" }}
                />
                <View className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              </View>
            </View>

            {/* Tap indicator */}
            <View className="absolute bottom-3 right-3 z-10">
              <Text className="text-white/20 text-xs">View Map →</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Active trips list */}
        <Text className="text-gray-200 font-semibold mb-2">
          Active / Pending Trips ({trips.length})
        </Text>
        {trips.length === 0 ? (
          <Card className="p-6 items-center mb-4">
            <Text className="text-gray-400">No active trips</Text>
          </Card>
        ) : (
          trips.map((item) => (
            <Card
              key={item.id}
              className="p-3 mb-2 flex-row justify-between items-center"
            >
              <View className="flex-1">
                <Text className="font-semibold text-white">{item.route}</Text>
                <Text className="text-sm text-gray-400">
                  ID: {item.id.slice(0, 8)} • {item.driver ?? "Unassigned"}
                </Text>
                <Text className="text-sm text-gray-400">
                  Passengers: {item.passengerCount} • ETA: {item.eta ?? "—"}
                </Text>
              </View>
              <View className="items-end">
                <StatusBadge status={item.status} />
                <TouchableOpacity
                  className="mt-2 bg-[#0ea5e9] px-4 py-1.5 rounded-xl"
                  onPress={() => openAssignModal(item)}
                >
                  <Text className="text-white text-sm font-medium">Assign</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Drivers panel */}
        <Text className="text-gray-200 font-semibold mt-4 mb-2">
          Drivers ({drivers.length})
        </Text>
        {drivers.length === 0 ? (
          <Card className="p-6 items-center">
            <Text className="text-gray-400">No drivers found</Text>
          </Card>
        ) : (
          drivers.map((item) => (
            <Card
              key={item.id}
              className="p-3 mb-2 flex-row justify-between items-center"
            >
              <View>
                <Text className="font-medium text-white">{item.name}</Text>
                <Text className="text-sm text-gray-400">
                  ID: {item.id.slice(0, 8)}
                </Text>
                {item.lastSeen && (
                  <Text className="text-xs text-gray-500">
                    Last seen: {new Date(item.lastSeen).toLocaleString()}
                  </Text>
                )}
              </View>
              <View className="items-end">
                <StatusBadge status={item.status} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Assign Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-[#1e293b] rounded-t-3xl max-h-[70%] p-4">
            <Text className="text-white text-lg font-bold mb-3">
              Assign Trip {selectedTrip?.id?.slice(0, 8) || ""}
            </Text>
            <Text className="text-gray-400 text-sm mb-3">
              Select a driver to assign this trip to.
            </Text>

            <FlatList
              data={drivers}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedDriverId(item.id)}
                  className={`p-3 rounded-lg mb-2 flex-row justify-between items-center ${
                    selectedDriverId === item.id
                      ? "bg-[#0ea5e9]/20 border border-[#0ea5e9]"
                      : "bg-[#0f172a]"
                  }`}
                >
                  <View>
                    <Text className="text-white font-medium">{item.name}</Text>
                    <Text className="text-xs text-gray-400">
                      {item.id.slice(0, 8)}
                      {item.lastSeen
                        ? ` • ${new Date(item.lastSeen).toLocaleTimeString()}`
                        : ""}
                    </Text>
                  </View>
                  <View>
                    <StatusBadge status={item.status} />
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={() => (
                <Text className="text-gray-500">No drivers available</Text>
              )}
            />

            <View className="flex-row justify-end gap-2 mt-3">
              <TouchableOpacity
                className="px-4 py-2 rounded-md"
                onPress={() => setAssignModalVisible(false)}
              >
                <Text className="text-gray-400">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 rounded-md bg-[#0ea5e9]"
                onPress={confirmAssign}
                disabled={assigning || !selectedDriverId}
                style={{ opacity: assigning || !selectedDriverId ? 0.6 : 1 }}
              >
                <Text className="text-white font-medium">
                  {assigning ? "Assigning..." : "Assign"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
