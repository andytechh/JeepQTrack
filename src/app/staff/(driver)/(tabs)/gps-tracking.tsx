// app/staff/(driver)/(tabs)/gps-tracking.tsx
import { router, useFocusEffect } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Gauge,
  History,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Send,
  Square,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MapView } from "@/src/shared/components/map/MapView";
import { StatusPill } from "@/src/shared/components/ui/StatusPill";
import { supabase } from "@/src/shared/config/supabase";
import { JeepneyMarker } from "@/src/shared/hooks/useGPSMap";
import { useAuthStore } from "@/src/shared/store/authStore";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  fetchRouteInfo,
  RouteInfo,
} from "../../../../src/shared/utils/routing";

const DARAGA_TERMINAL = { latitude: 13.14769, longitude: 123.71216 };
const DONSON_TERMINAL = { latitude: 12.9032, longitude: 123.59425 };
const TERMINAL_NAMES: Record<number, string> = { 1: "Donsol", 2: "Daraga" };
const AVERAGE_SPEED_KPH = 25;
const BUFFER_MAX = 15;
const BUFFER_MIN = 3;

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface ExtendedJeepneyMarker extends JeepneyMarker {
  terminalId?: number;
}

export default function DriverGPSTrackingScreen() {
  const { user } = useAuthStore();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ExtendedJeepneyMarker[]>([]);
  const [selectedJeepney, setSelectedJeepney] =
    useState<ExtendedJeepneyMarker | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [shared, setShared] = useState(false);

  const [speed, setSpeed] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  const [doorCounts, setDoorCounts] = useState({
    front_count: 0,
    rear_count: 0,
  });
  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const webViewRef = useRef<any>(null);
  const gpsChannelRef = useRef<any>(null);
  const statusChannelRef = useRef<any>(null);
  const doorChannelRef = useRef<any>(null);
  const trackingRef = useRef(tracking);
  const selectedJeepneyRef = useRef(selectedJeepney);
  const lastEtaRef = useRef<number | null>(null);

  const totalRoadDistanceRef = useRef<number>(0);
  const initialStraightLineRef = useRef<number>(0);
  const totalTripDurationRef = useRef<number>(0);
  const routeInfoRef = useRef<RouteInfo | null>(null);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);
  useEffect(() => {
    selectedJeepneyRef.current = selectedJeepney;
  }, [selectedJeepney]);

  const fetchMarkers = useCallback(async () => {
    try {
      setError(null);
      const { data: gpsData, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select(
          `
          jeepney_id,
          latitude,
          longitude,
          speed,
          recorded_at,
          jeepneys:jeepney_id (
            id,
            plate_number,
            status,
            current_occupancy,
            capacity,
            driver_name,
            terminal_id
          )
        `,
        )
        .order("recorded_at", { ascending: false });

      if (gpsError) throw gpsError;

      const uniqueMap = new Map<string, ExtendedJeepneyMarker>();
      gpsData?.forEach((record: any) => {
        const j = record.jeepneys;
        if (!j || uniqueMap.has(record.jeepney_id)) return;
        uniqueMap.set(record.jeepney_id, {
          id: record.jeepney_id,
          lat: record.latitude,
          lng: record.longitude,
          plateNumber: j.plate_number,
          status: j.status || "en_route",
          occupancy: j.current_occupancy || 0,
          capacity: j.capacity || 24,
          driverName: j.driver_name || "Unknown",
          isDriver: record.jeepney_id === user?.jeepneyId,
          speed: record.speed,
          terminalId: j.terminal_id || 1,
        });
      });

      const markerList = Array.from(uniqueMap.values());
      setMarkers(markerList);
      setLastUpdate(new Date().toISOString());

      if (selectedJeepney) {
        const updated = markerList.find((m) => m.id === selectedJeepney.id);
        if (updated) {
          setSelectedJeepney(updated);
        } else {
          setSelectedJeepney(null);
          setTracking(false);
          setSpeed(null);
          setDistance(null);
          setEta(null);
          setTripHistory([]);
          setDoorCounts({ front_count: 0, rear_count: 0 });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.jeepneyId, selectedJeepney]);

  const fetchTripHistory = useCallback(async (jeepneyId: string) => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("jeepney_id", jeepneyId)
        .order("departure_time", { ascending: false })
        .limit(20);
      if (error) throw error;
      setTripHistory(data || []);
    } catch (err) {
      console.error("Error fetching trip history:", err);
    }
  }, []);

  const handleMarkerPress = useCallback(
    (jeepneyId: string) => {
      const jeep = markers.find((m) => m.id === jeepneyId);
      if (jeep) {
        setSelectedJeepney(jeep);
        fetchTripHistory(jeepneyId);
        supabase
          .from("door_counts")
          .select("front_count, rear_count")
          .eq("jeep_id", jeepneyId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data?.length) {
              setDoorCounts({
                front_count: data[0].front_count || 0,
                rear_count: data[0].rear_count || 0,
              });
            }
          });

        if (webViewRef.current) {
          const terminalId = jeep.terminalId || 1;
          const isOrigin = terminalId === 1;
          const origin = isOrigin ? DONSON_TERMINAL : DARAGA_TERMINAL;
          const dest = isOrigin ? DARAGA_TERMINAL : DONSON_TERMINAL;
          const originName = isOrigin ? "Donsol Terminal" : "Daraga Terminal";
          const destName = isOrigin ? "Daraga Terminal" : "Donsol Terminal";

          webViewRef.current.postMessage(
            JSON.stringify({
              type: "updateRoute",
              originLat: origin.latitude,
              originLng: origin.longitude,
              originName,
              destLat: dest.latitude,
              destLng: dest.longitude,
              destName,
            }),
          );
        }
      }
    },
    [markers, fetchTripHistory],
  );

  // ─── Subscriptions with UNIQUE channel names ────────────────────
  useEffect(() => {
    // Clean up previous channels
    if (gpsChannelRef.current) {
      gpsChannelRef.current.unsubscribe();
      gpsChannelRef.current = null;
    }
    if (statusChannelRef.current) {
      statusChannelRef.current.unsubscribe();
      statusChannelRef.current = null;
    }

    // Generate unique names
    const gpsChannelName = `gps_tracking_updates_driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const statusChannelName = `online_jeepneys_driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // GPS channel
    const gpsChannel = supabase
      .channel(gpsChannelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gps_tracking" },
        async (payload) => {
          const newLoc = payload.new;
          console.log(
            "📡 GPS INSERT:",
            newLoc.jeepney_id,
            "speed:",
            newLoc.speed,
          );

          setMarkers((prev) =>
            prev.map((m) =>
              m.id === newLoc.jeepney_id
                ? {
                    ...m,
                    lat: newLoc.latitude,
                    lng: newLoc.longitude,
                    speed: newLoc.speed,
                  }
                : m,
            ),
          );
          setLastUpdate(newLoc.recorded_at);

          if (
            trackingRef.current &&
            selectedJeepneyRef.current &&
            newLoc.jeepney_id === selectedJeepneyRef.current.id
          ) {
            const spd = newLoc.speed || 0;
            setSpeed(spd);

            const currentTerminal = selectedJeepneyRef.current.terminalId || 1;
            const destTerminal = currentTerminal === 1 ? 2 : 1;
            const destCoords =
              destTerminal === 1 ? DONSON_TERMINAL : DARAGA_TERMINAL;

            const currentStraightLine = haversineDistance(
              newLoc.latitude,
              newLoc.longitude,
              destCoords.latitude,
              destCoords.longitude,
            );

            let progress: number;
            if (initialStraightLineRef.current > 0) {
              progress = Math.min(
                currentStraightLine / initialStraightLineRef.current,
                1,
              );
            } else {
              progress = 0;
            }

            let remainingRoad: number;
            if (totalRoadDistanceRef.current > 0) {
              remainingRoad = totalRoadDistanceRef.current * (1 - progress);
            } else {
              remainingRoad = currentStraightLine;
              totalRoadDistanceRef.current = currentStraightLine;
              initialStraightLineRef.current = currentStraightLine;
            }
            setDistance(remainingRoad);

            const remainingFraction = Math.max(0, 1 - progress);
            const travelTime = remainingFraction * totalTripDurationRef.current;
            const buffer = Math.max(BUFFER_MIN, BUFFER_MAX * (1 - progress));
            let newEta = Math.round(travelTime + buffer);
            if (newEta < 1) newEta = 1;
            if (newEta > 120) newEta = 120;

            if (newEta !== null) {
              setEta(newEta);
              lastEtaRef.current = newEta;
            }

            console.log("📊 Updated stats:", {
              speed: spd,
              progress,
              remainingRoad,
              travelTime,
              buffer,
              eta: newEta,
              totalDuration: totalTripDurationRef.current,
            });
          }
        },
      )
      .subscribe((status) => console.log("GPS subscription status:", status));

    gpsChannelRef.current = gpsChannel;

    // Status channel
    const statusChannel = supabase
      .channel(statusChannelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jeepneys" },
        (payload) => {
          const updated = payload.new;
          setMarkers((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    status: updated.status,
                    occupancy: updated.current_occupancy,
                    terminalId: updated.terminal_id,
                  }
                : m,
            ),
          );
          if (
            selectedJeepneyRef.current &&
            selectedJeepneyRef.current.id === updated.id
          ) {
            setSelectedJeepney((prev) =>
              prev
                ? {
                    ...prev,
                    status: updated.status,
                    occupancy: updated.current_occupancy,
                    terminalId: updated.terminal_id,
                  }
                : null,
            );
          }
        },
      )
      .subscribe();

    statusChannelRef.current = statusChannel;

    return () => {
      gpsChannelRef.current?.unsubscribe();
      gpsChannelRef.current = null;
      statusChannelRef.current?.unsubscribe();
      statusChannelRef.current = null;
    };
  }, []); // runs once

  // ─── Door count subscription (with unique name) ──────────────────
  useEffect(() => {
    if (doorChannelRef.current) {
      doorChannelRef.current.unsubscribe();
      doorChannelRef.current = null;
    }

    if (!selectedJeepney?.id) return;

    const doorChannelName = `door_counts_${selectedJeepney.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const doorChannel = supabase
      .channel(doorChannelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "door_counts",
          filter: `jeep_id=eq.${selectedJeepney.id}`,
        },
        (payload) => {
          const newDoor = payload.new;
          setDoorCounts({
            front_count: newDoor.front_count || 0,
            rear_count: newDoor.rear_count || 0,
          });
          const total = (newDoor.front_count || 0) + (newDoor.rear_count || 0);
          setMarkers((prev) =>
            prev.map((m) =>
              m.id === selectedJeepney.id ? { ...m, occupancy: total } : m,
            ),
          );
          if (selectedJeepneyRef.current?.id === selectedJeepney.id) {
            setSelectedJeepney((prev) =>
              prev ? { ...prev, occupancy: total } : null,
            );
          }
        },
      )
      .subscribe();

    doorChannelRef.current = doorChannel;

    return () => {
      doorChannelRef.current?.unsubscribe();
      doorChannelRef.current = null;
    };
  }, [selectedJeepney?.id]);

  // ─── Focus effect ──────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchTime.current > 30000) {
        fetchMarkers();
        lastFetchTime.current = now;
      }
    }, [fetchMarkers]),
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchMarkers();
    lastFetchTime.current = Date.now();
  }, [fetchMarkers, refreshing]);

  const toggleTracking = useCallback(async () => {
    if (!selectedJeepney) {
      Alert.alert("Select a jeepney", "Tap on a jeepney marker first.");
      return;
    }
    if (!selectedJeepney.lat || !selectedJeepney.lng) {
      Alert.alert("No location", "This jeepney has no location data.");
      return;
    }

    if (!tracking) {
      const currentTerminal = selectedJeepney.terminalId || 1;
      const destTerminal = currentTerminal === 1 ? 2 : 1;
      const destCoords = destTerminal === 1 ? DONSON_TERMINAL : DARAGA_TERMINAL;

      let info: RouteInfo | null = null;
      try {
        info = await fetchRouteInfo(
          selectedJeepney.lat,
          selectedJeepney.lng,
          destCoords.latitude,
          destCoords.longitude,
        );
        console.log("📡 Route info fetched:", info);
      } catch (e) {
        console.warn("Route fetch failed, using straight-line distance", e);
      }

      const straightDist = haversineDistance(
        selectedJeepney.lat,
        selectedJeepney.lng,
        destCoords.latitude,
        destCoords.longitude,
      );

      if (info) {
        routeInfoRef.current = info;
        totalRoadDistanceRef.current = info.distanceKm;
        totalTripDurationRef.current = info.durationMin;
        initialStraightLineRef.current = straightDist;
        setDistance(info.distanceKm);
        const initialEta = info.durationMin + BUFFER_MAX;
        setEta(initialEta);
        lastEtaRef.current = initialEta;
      } else {
        const estimatedDuration = Math.round(
          (straightDist / AVERAGE_SPEED_KPH) * 60,
        );
        totalRoadDistanceRef.current = straightDist;
        totalTripDurationRef.current = estimatedDuration;
        initialStraightLineRef.current = straightDist;
        setDistance(straightDist);
        const initialEta = estimatedDuration + BUFFER_MAX;
        setEta(initialEta);
        lastEtaRef.current = initialEta;
      }

      setTracking(true);
    } else {
      setTracking(false);
      setSpeed(null);
      setDistance(null);
      setEta(null);
      lastEtaRef.current = null;
      routeInfoRef.current = null;
      totalRoadDistanceRef.current = 0;
      initialStraightLineRef.current = 0;
      totalTripDurationRef.current = 0;
    }
  }, [selectedJeepney, tracking]);

  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const surfaceBg = isDark ? "bg-slate-800" : "bg-white";
  const surfaceSecondary = isDark ? "bg-slate-700" : "bg-slate-100";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const panelHeight = panelExpanded ? "65%" : "32%";

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${bgColor} items-center justify-center`}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className={`mt-3 ${textMuted}`}>Loading jeepneys...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        className={`flex-1 ${bgColor} items-center justify-center p-5`}
      >
        <AlertCircle size={48} color="#ef4444" />
        <Text className="text-red-500 text-lg font-semibold mt-3">{error}</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          className="mt-4 bg-sky-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <View
        className={`flex-row items-center px-4 py-3 border-b ${borderColor} ${surfaceBg}`}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color={isDark ? "#94a3b8" : "#0f172a"} />
        </TouchableOpacity>
        <Text className={`flex-1 text-center text-lg font-bold ${textPrimary}`}>
          Live Tracking
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          className={`p-1.5 rounded-full ${surfaceSecondary} mr-1`}
        >
          <RefreshCw
            size={20}
            color={isDark ? "#94a3b8" : "#0f172a"}
            className={refreshing ? "opacity-50" : ""}
          />
        </TouchableOpacity>
        <View
          className={`flex-row items-center px-3 py-1 rounded-full border ${markers.length > 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}
        >
          <View
            className={`w-1.5 h-1.5 rounded-full ${markers.length > 0 ? "bg-green-500" : "bg-red-500"} mr-1.5`}
          />
          <Text
            className={`text-[10px] font-semibold ${markers.length > 0 ? "text-green-500" : "text-red-500"}`}
          >
            {markers.length > 0 ? `${markers.length} ONLINE` : "NO JEEPNEYS"}
          </Text>
        </View>
      </View>

      <View className="flex-1">
        <MapView
          ref={webViewRef}
          markers={markers}
          onMarkerPress={handleMarkerPress}
          showControls={true}
          enableRealtime={false}
        />
      </View>

      <View
        className={`${surfaceBg} border-t ${borderColor}`}
        style={{ height: panelHeight }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 pt-2">
            <TouchableOpacity
              onPress={() => setPanelExpanded(!panelExpanded)}
              className="items-center mb-2"
            >
              <View className={`w-10 h-1 rounded-full ${borderColor}`} />
              {panelExpanded ? (
                <ChevronDown size={20} color={isDark ? "#94a3b8" : "#0f172a"} />
              ) : (
                <ChevronUp size={20} color={isDark ? "#94a3b8" : "#0f172a"} />
              )}
            </TouchableOpacity>

            <View className="flex-row justify-between mb-3">
              <View>
                <Text
                  className={`text-[11px] font-semibold uppercase ${textMuted}`}
                >
                  Current location
                </Text>
                <Text className={`text-base font-semibold ${textPrimary}`}>
                  {selectedJeepney?.lat && selectedJeepney?.lng
                    ? `${selectedJeepney.lat.toFixed(4)}, ${selectedJeepney.lng.toFixed(4)}`
                    : "No jeepney selected"}
                </Text>
                <Text className={`text-sm ${textMuted}`}>
                  {selectedJeepney?.plateNumber
                    ? `${selectedJeepney.plateNumber} · ${selectedJeepney.driverName || "Unknown"}`
                    : "Tap a marker to select"}
                </Text>
                {selectedJeepney && (
                  <>
                    <Text className={`text-sm ${textSecondary} mt-0.5`}>
                      👤 Occupancy:{" "}
                      {doorCounts.front_count + doorCounts.rear_count} /{" "}
                      {selectedJeepney.capacity || 24}
                    </Text>
                    <Text className={`text-sm ${textSecondary} mt-0.5`}>
                      Terminal:{" "}
                      {TERMINAL_NAMES[selectedJeepney.terminalId || 1] ||
                        "Unknown"}
                    </Text>
                  </>
                )}
              </View>
              <View style={{ flexShrink: 0 }}>
                <StatusPill
                  status={tracking ? "online" : "offline"}
                  dot
                  isDark={isDark}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className={`flex-1 p-3 rounded-xl ${surfaceSecondary}`}>
                <View className="flex-row items-center gap-1">
                  <Gauge size={14} color={isDark ? "#94a3b8" : "#94a3b8"} />
                  <Text className={`text-[11px] ${textMuted}`}>Speed</Text>
                </View>
                <Text className={`text-lg font-bold ${textPrimary}`}>
                  {tracking && speed !== null
                    ? `${Math.round(speed)} km/h`
                    : "—"}
                </Text>
              </View>
              <View className={`flex-1 p-3 rounded-xl ${surfaceSecondary}`}>
                <View className="flex-row items-center gap-1">
                  <Route size={14} color={isDark ? "#94a3b8" : "#94a3b8"} />
                  <Text className={`text-[11px] ${textMuted}`}>Distance</Text>
                </View>
                <Text className={`text-lg font-bold ${textPrimary}`}>
                  {tracking && distance !== null
                    ? `${distance.toFixed(1)} km`
                    : "—"}
                </Text>
              </View>
              <View className={`flex-1 p-3 rounded-xl ${surfaceSecondary}`}>
                <View className="flex-row items-center gap-1">
                  <Navigation
                    size={14}
                    color={isDark ? "#94a3b8" : "#94a3b8"}
                  />
                  <Text className={`text-[11px] ${textMuted}`}>ETA</Text>
                </View>
                <Text className={`text-lg font-bold ${textPrimary}`}>
                  {tracking && eta !== null ? `${eta} min` : "—"}
                </Text>
              </View>
            </View>

            <View className={`h-px ${borderColor} mb-3`} />

            {selectedJeepney && (
              <View className="mb-3">
                <Text
                  className={`text-xs font-semibold uppercase ${textMuted}`}
                >
                  Current Trip
                </Text>
                <View className="flex-row items-center mt-1">
                  <MapPin size={16} color="#22c55e" />
                  <Text className={`ml-1 font-medium ${textPrimary}`}>
                    {TERMINAL_NAMES[selectedJeepney.terminalId || 1]}
                  </Text>
                  <Text className={`mx-2 ${textMuted}`}>→</Text>
                  <MapPin size={16} color="#f59e0b" />
                  <Text className={`ml-1 font-medium ${textPrimary}`}>
                    {TERMINAL_NAMES[selectedJeepney.terminalId === 1 ? 2 : 1]}
                  </Text>
                </View>
                <Text className={`text-xs ${textMuted} mt-1`}>
                  Status: {selectedJeepney.status?.toUpperCase() || "UNKNOWN"}
                </Text>
              </View>
            )}

            <View className="flex-row gap-3 mb-3">
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center ${tracking ? "bg-red-500" : "bg-sky-500"} ${!selectedJeepney ? "opacity-50" : ""}`}
                onPress={toggleTracking}
                disabled={!selectedJeepney}
              >
                {tracking ? (
                  <Square size={20} color="white" />
                ) : (
                  <Navigation size={20} color="white" />
                )}
                <Text className="text-white font-semibold text-sm ml-2">
                  {tracking ? "Stop" : "Start"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center border ${borderColor} ${surfaceSecondary}`}
                onPress={() => setShared(!shared)}
                disabled={!selectedJeepney}
              >
                <Send size={20} color="#0ea5e9" />
                <Text className="text-sky-500 font-semibold text-sm ml-2">
                  {shared ? "Shared" : "Share"}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedJeepney && (
              <TouchableOpacity
                onPress={() => setShowHistory(!showHistory)}
                className="flex-row items-center mb-3"
              >
                <History size={16} color={isDark ? "#94a3b8" : "#0f172a"} />
                <Text className={`ml-2 text-sm font-medium ${textPrimary}`}>
                  {showHistory ? "Hide" : "Show"} Trip History
                </Text>
              </TouchableOpacity>
            )}

            {showHistory && (
              <View className="mt-2">
                {tripHistory.length === 0 ? (
                  <Text className={`text-sm ${textMuted}`}>
                    No trips recorded yet.
                  </Text>
                ) : (
                  tripHistory.map((trip) => (
                    <View
                      key={trip.id}
                      className={`p-3 rounded-lg ${surfaceSecondary} mb-2`}
                    >
                      <View className="flex-row justify-between">
                        <Text className={`font-medium ${textPrimary}`}>
                          {TERMINAL_NAMES[trip.departure_terminal_id]} →{" "}
                          {TERMINAL_NAMES[trip.arrival_terminal_id]}
                        </Text>
                        <Text className={`text-xs ${textMuted}`}>
                          {trip.status}
                        </Text>
                      </View>
                      <Text className={`text-xs ${textMuted}`}>
                        {new Date(trip.departure_time).toLocaleString()}
                      </Text>
                      {trip.arrival_time && (
                        <Text className={`text-xs ${textMuted}`}>
                          Arrived:{" "}
                          {new Date(trip.arrival_time).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
