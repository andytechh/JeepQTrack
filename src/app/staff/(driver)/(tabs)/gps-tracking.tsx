// app/staff/(driver)/gps-tracking.tsx
import { LinearGradient } from "expo-linear-gradient";
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
import { Button } from "@/src/shared/components/ui/Button";
import { Card } from "@/src/shared/components/ui/Card";
import { StatusPill } from "@/src/shared/components/ui/StatusPill";
import { supabase } from "@/src/shared/config/supabase";
import { lightTheme, theme } from "@/src/shared/constants/theme";
import { JeepneyMarker } from "@/src/shared/hooks/useGPSMap";
import { useAuthStore } from "@/src/shared/store/authStore";
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

  // ─── LOADING / ERROR ─────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: lightTheme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={{ marginTop: 12, color: lightTheme.text.muted }}>
          Loading jeepneys...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: lightTheme.background,
          padding: 20,
        }}
      >
        <AlertCircle size={48} color={theme.colors.status.error} />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginTop: 12,
            color: theme.colors.status.error,
          }}
        >
          {error}
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={{
            marginTop: 16,
            backgroundColor: theme.colors.primary[500],
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: lightTheme.background }}>
      {/* Header */}
      <LinearGradient
        colors={[lightTheme.background, lightTheme.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={{
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: lightTheme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: lightTheme.surfaceSecondary,
            }}
          >
            <ArrowLeft size={22} color={lightTheme.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "700",
              color: lightTheme.text.primary,
            }}
          >
            Live Tracking
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={{
              padding: 6,
              borderRadius: 20,
              backgroundColor: lightTheme.surfaceSecondary,
              marginRight: 6,
            }}
          >
            <RefreshCw
              size={20}
              color={
                refreshing ? lightTheme.text.muted : lightTheme.text.primary
              }
            />
          </TouchableOpacity>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor:
                markers.length > 0
                  ? `${theme.colors.status.online}15`
                  : `${theme.colors.status.error}15`,
              borderRadius: 20,
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor:
                markers.length > 0
                  ? `${theme.colors.status.online}30`
                  : `${theme.colors.status.error}30`,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  markers.length > 0
                    ? theme.colors.status.online
                    : theme.colors.status.error,
              }}
            />
            <Text
              style={{
                color:
                  markers.length > 0
                    ? theme.colors.status.online
                    : theme.colors.status.error,
                fontSize: 10,
                fontWeight: "600",
              }}
            >
              {markers.length > 0 ? `${markers.length} ONLINE` : "NO JEEPNEYS"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Map */}
      <View style={{ flex: 1 }}>
        <MapView
          markers={markers}
          onMarkerPress={handleMarkerPress}
          showControls={true}
          enableRealtime={false}
        />
      </View>

      {/* Bottom panel */}
      <ScrollView
        style={{ maxHeight: 340, backgroundColor: lightTheme.surface }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Card
          style={{
            marginHorizontal: 0,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingTop: 4,
            paddingHorizontal: 16,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: lightTheme.border,
              }}
            />
          </View>

          {/* Location & status */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  color: lightTheme.text.muted,
                }}
              >
                Current location
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: lightTheme.text.primary,
                }}
              >
                {selectedJeepney?.lat && selectedJeepney?.lng
                  ? `${selectedJeepney.lat.toFixed(4)}, ${selectedJeepney.lng.toFixed(4)}`
                  : "No jeepney selected"}
              </Text>
              <Text style={{ fontSize: 12, color: lightTheme.text.muted }}>
                {selectedJeepney?.plateNumber
                  ? `${selectedJeepney.plateNumber} · ${selectedJeepney.driverName || "Unknown"}`
                  : "Tap a marker to select"}
              </Text>
              {selectedJeepney && (
                <Text
                  style={{
                    fontSize: 12,
                    color: lightTheme.text.secondary,
                    marginTop: 2,
                  }}
                >
                  👤 Occupancy: {selectedJeepney.occupancy || 0} /{" "}
                  {selectedJeepney.capacity || 24}
                </Text>
              )}
            </View>
            <StatusPill status={tracking ? "online" : "offline"} dot />
          </View>

          {/* Stats grid */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: lightTheme.surfaceSecondary,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Gauge size={14} color={lightTheme.text.muted} />
                <Text style={{ fontSize: 11, color: lightTheme.text.muted }}>
                  Speed
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: lightTheme.text.primary,
                }}
              >
                {tracking && speed !== null ? `${Math.round(speed)} km/h` : "—"}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: lightTheme.surfaceSecondary,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Route size={14} color={lightTheme.text.muted} />
                <Text style={{ fontSize: 11, color: lightTheme.text.muted }}>
                  Distance
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: lightTheme.text.primary,
                }}
              >
                {tracking && distance !== null
                  ? `${distance.toFixed(1)} km`
                  : "—"}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: lightTheme.surfaceSecondary,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Navigation size={14} color={lightTheme.text.muted} />
                <Text style={{ fontSize: 11, color: lightTheme.text.muted }}>
                  ETA
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: lightTheme.text.primary,
                }}
              >
                {tracking && eta !== null ? `${eta} min` : "—"}
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: lightTheme.border,
              marginBottom: 12,
            }}
          />

          {/* Trip info */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: lightTheme.text.muted }}>Trip</Text>
            <Text style={{ fontWeight: "500", color: lightTheme.text.primary }}>
              {selectedJeepney?.plateNumber || "Select"} · Donsol → Daraga
            </Text>
          </View>

          {/* ─── BUTTONS IN ROW ──────────────────────────────────────── */}
          <View className="flex-row gap-3">
            <Button
              variant={tracking ? "danger" : "primary"}
              size="lg"
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={toggleTracking}
              disabled={!selectedJeepney}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {tracking ? (
                  <Square size={20} color="white" style={{ marginRight: 8 }} />
                ) : (
                  <Navigation
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "600" }}
                >
                  {tracking ? "Stop" : "Start"}
                </Text>
              </View>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: lightTheme.border,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setShared(!shared)}
              disabled={!selectedJeepney}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Send
                  size={20}
                  color={theme.colors.primary[500]}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    color: theme.colors.primary[500],
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {shared ? "Shared" : "Share"}
                </Text>
              </View>
            </Button>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
