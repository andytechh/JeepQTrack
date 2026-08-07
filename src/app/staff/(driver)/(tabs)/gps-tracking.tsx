// app/staff/(driver)/gps-tracking.tsx
import { router, useFocusEffect } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Gauge,
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

// ─── CONSTANTS ──────────────────────────────────────────────────────
const DARAGA_TERMINAL = { latitude: 13.14769, longitude: 123.71216 };

// Haversine distance helper
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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function DriverGPSTrackingScreen() {
  const { user } = useAuthStore();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [markers, setMarkers] = useState<JeepneyMarker[]>([]);
  const [selectedJeepney, setSelectedJeepney] = useState<JeepneyMarker | null>(
    null,
  );
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [shared, setShared] = useState(false);

  // Stats
  const [speed, setSpeed] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  const subscriptionRef = useRef<any>(null);

  const lastEtaRef = useRef<number | null>(null);
  const initialStraightLineRef = useRef<number>(0);
  const totalRoadDistanceRef = useRef<number>(0);
  const routeInfoRef = useRef<RouteInfo | null>(null);

  // Cache: avoid refetching on every focus
  const lastFetchTime = useRef<number>(0);

  // ─── FETCH MARKERS ────────────────────────────────────────────────
  const fetchMarkers = useCallback(async () => {
    try {
      setError(null);
      const { data: gpsData, error: gpsError } = await supabase
        .from("gps_tracking")
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
            driver_name
          )
        `,
        )
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (gpsError) throw gpsError;

      const uniqueMap = new Map<string, JeepneyMarker>();
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
        });
      });

      const markerList = Array.from(uniqueMap.values());
      setMarkers(markerList);
      setLastUpdate(new Date().toISOString());

      // If tracking, keep selected jeepney updated
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
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.jeepneyId, selectedJeepney]);

  // ─── HANDLE MARKER PRESS ─────────────────────────────────────────
  const handleMarkerPress = useCallback(
    (jeepneyId: string) => {
      const jeep = markers.find((m) => m.id === jeepneyId);
      if (jeep) {
        setSelectedJeepney(jeep);
      }
    },
    [markers],
  );

  // ─── REALTIME SUBSCRIPTIONS (OPTIMIZED) ──────────────────────────
  useEffect(() => {
    // 1. GPS inserts – update marker positions without REST
    const gpsChannel = supabase
      .channel("gps_tracking_updates_driver")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gps_tracking" },
        async (payload) => {
          const newLoc = payload.new;
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

          // If tracking this jeepney, update stats
          if (
            tracking &&
            selectedJeepney &&
            newLoc.jeepney_id === selectedJeepney.id
          ) {
            const spd = newLoc.speed || 0;
            setSpeed(spd);

            const currentStraightLine = haversineDistance(
              newLoc.latitude,
              newLoc.longitude,
              DARAGA_TERMINAL.latitude,
              DARAGA_TERMINAL.longitude,
            );

            let remainingRoad: number;
            if (
              totalRoadDistanceRef.current > 0 &&
              initialStraightLineRef.current > 0
            ) {
              const progressRatio =
                currentStraightLine / initialStraightLineRef.current;
              remainingRoad = totalRoadDistanceRef.current * progressRatio;
            } else {
              remainingRoad = currentStraightLine;
            }
            setDistance(remainingRoad);

            let newEta: number | null = null;
            if (spd > 0) {
              newEta = Math.round((remainingRoad / spd) * 60);
            } else {
              newEta =
                lastEtaRef.current ?? routeInfoRef.current?.durationMin ?? null;
            }
            if (newEta !== null) {
              setEta(newEta);
              lastEtaRef.current = newEta;
            }
          }
        },
      )
      .subscribe();

    // 2. Status/occupancy updates – patch markers without REST
    const statusChannel = supabase
      .channel("online_jeepneys_driver")
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
                  }
                : m,
            ),
          );
          if (selectedJeepney && selectedJeepney.id === updated.id) {
            setSelectedJeepney((prev) =>
              prev
                ? {
                    ...prev,
                    status: updated.status,
                    occupancy: updated.current_occupancy,
                  }
                : null,
            );
          }
        },
      )
      .subscribe();

    subscriptionRef.current = { gpsChannel, statusChannel };

    return () => {
      gpsChannel?.unsubscribe();
      statusChannel?.unsubscribe();
    };
  }, [tracking, selectedJeepney]);

  // ─── INITIAL FETCH (with cache) ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchTime.current > 30000) {
        // only if >30s old
        fetchMarkers();
        lastFetchTime.current = now;
      }
    }, [fetchMarkers]),
  );

  // ─── HANDLERS ────────────────────────────────────────────────────
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
      const info = await fetchRouteInfo(
        selectedJeepney.lat,
        selectedJeepney.lng,
        DARAGA_TERMINAL.latitude,
        DARAGA_TERMINAL.longitude,
      );
      routeInfoRef.current = info;
      totalRoadDistanceRef.current = info.distanceKm;
      initialStraightLineRef.current = haversineDistance(
        selectedJeepney.lat,
        selectedJeepney.lng,
        DARAGA_TERMINAL.latitude,
        DARAGA_TERMINAL.longitude,
      );

      setDistance(info.distanceKm);
      setEta(info.durationMin);
      lastEtaRef.current = info.durationMin;

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
    }
  }, [selectedJeepney, tracking]);

  // ─── STYLES ──────────────────────────────────────────────────────
  const bgColor = isDark ? "bg-slate-900" : "bg-slate-50";
  const surfaceBg = isDark ? "bg-slate-800" : "bg-white";
  const surfaceSecondary = isDark ? "bg-slate-700" : "bg-slate-100";
  const borderColor = isDark ? "border-slate-700" : "border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const textDim = isDark ? "text-slate-500" : "text-slate-400";

  // ─── LOADING / ERROR ─────────────────────────────────────────────
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

  // ─── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      {/* Header */}
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
          className={`flex-row items-center px-3 py-1 rounded-full border ${
            markers.length > 0
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <View
            className={`w-1.5 h-1.5 rounded-full ${
              markers.length > 0 ? "bg-green-500" : "bg-red-500"
            } mr-1.5`}
          />
          <Text
            className={`text-[10px] font-semibold ${
              markers.length > 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {markers.length > 0 ? `${markers.length} ONLINE` : "NO JEEPNEYS"}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View className="flex-1">
        <MapView
          markers={markers}
          onMarkerPress={handleMarkerPress}
          showControls={true}
          enableRealtime={false}
        />
      </View>

      {/* Bottom panel */}
      <ScrollView
        className={`${surfaceBg} max-h-[340px]`}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-2">
          {/* Drag handle */}
          <View className="items-center mb-3">
            <View className={`w-10 h-1 rounded-full ${borderColor}`} />
          </View>

          {/* Location & status */}
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
              <Text className={`text-xs ${textMuted}`}>
                {selectedJeepney?.plateNumber
                  ? `${selectedJeepney.plateNumber} · ${selectedJeepney.driverName || "Unknown"}`
                  : "Tap a marker to select"}
              </Text>
              {selectedJeepney && (
                <Text className={`text-xs ${textSecondary} mt-0.5`}>
                  👤 Occupancy: {selectedJeepney.occupancy || 0} /{" "}
                  {selectedJeepney.capacity || 24}
                </Text>
              )}
            </View>
            <StatusPill
              status={tracking ? "online" : "offline"}
              dot
              isDark={isDark}
            />
          </View>

          {/* Stats grid */}
          <View className="flex-row gap-3 mb-3">
            <View className={`flex-1 p-3 rounded-xl ${surfaceSecondary}`}>
              <View className="flex-row items-center gap-1">
                <Gauge size={14} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text className={`text-[11px] ${textMuted}`}>Speed</Text>
              </View>
              <Text className={`text-lg font-bold ${textPrimary}`}>
                {tracking && speed !== null ? `${Math.round(speed)} km/h` : "—"}
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
                <Navigation size={14} color={isDark ? "#94a3b8" : "#94a3b8"} />
                <Text className={`text-[11px] ${textMuted}`}>ETA</Text>
              </View>
              <Text className={`text-lg font-bold ${textPrimary}`}>
                {tracking && eta !== null ? `${eta} min` : "—"}
              </Text>
            </View>
          </View>

          <View className={`h-px ${borderColor} mb-3`} />

          {/* Trip info */}
          <View className="flex-row justify-between mb-3">
            <Text className={textMuted}>Trip</Text>
            <Text className={`font-medium ${textPrimary}`}>
              {selectedJeepney?.plateNumber || "Select"} · Donsol → Daraga
            </Text>
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center ${
                tracking ? "bg-red-500" : "bg-sky-500"
              } ${!selectedJeepney ? "opacity-50" : ""}`}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
