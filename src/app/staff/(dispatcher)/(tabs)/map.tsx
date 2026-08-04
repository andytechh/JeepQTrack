// app/staff/(dispatcher)/gps-tracking.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Gauge,
  Navigation,
  RefreshCw,
  Route,
  Users
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
import { useDispatcherGPS } from "@/src/shared/hooks/useDispatcherGPS";
import { JeepneyMarker } from "@/src/shared/hooks/useGPSMap";
import { fetchRouteInfo, RouteInfo } from "@/src/shared/utils/routing";

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
export default function DispatcherGPSTrackingScreen() {
  const { markers, loading, error, fetchMarkers } = useDispatcherGPS();
  const [selectedJeepney, setSelectedJeepney] = useState<JeepneyMarker | null>(
    null,
  );
  const [sendingAlert, setSendingAlert] = useState(false);

  // Stats
  const [speed, setSpeed] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  // Refs for route info
  const routeInfoRef = useRef<RouteInfo | null>(null);
  const initialStraightLineRef = useRef<number>(0);
  const totalRoadDistanceRef = useRef<number>(0);
  const lastEtaRef = useRef<number | null>(null);

  // ─── HANDLE MARKER PRESS ─────────────────────────────────────────
  const handleMarkerPress = useCallback(
    async (jeepneyId: string) => {
      const jeep = markers.find((m) => m.id === jeepneyId);
      if (!jeep) return;

      // Fetch latest door count for accurate occupancy
      const { data } = await supabase
        .from("door_counts")
        .select("front_count, rear_count")
        .eq("jeep_id", jeepneyId)
        .order("updated_at", { ascending: false })
        .limit(1);

      const occupancy = data?.[0]
        ? data[0].front_count + data[0].rear_count
        : jeep.occupancy;

      const updatedJeep = { ...jeep, occupancy };
      setSelectedJeepney(updatedJeep);

      // Compute stats if location exists
      if (updatedJeep.lat && updatedJeep.lng) {
        const spd = updatedJeep.speed || 0;
        setSpeed(spd);

        // Fetch route info once (OSRM or fallback)
        const info = await fetchRouteInfo(
          updatedJeep.lat,
          updatedJeep.lng,
          DARAGA_TERMINAL.latitude,
          DARAGA_TERMINAL.longitude,
        );
        routeInfoRef.current = info;
        totalRoadDistanceRef.current = info.distanceKm;
        initialStraightLineRef.current = haversineDistance(
          updatedJeep.lat,
          updatedJeep.lng,
          DARAGA_TERMINAL.latitude,
          DARAGA_TERMINAL.longitude,
        );

        setDistance(info.distanceKm);
        setEta(info.durationMin);
        lastEtaRef.current = info.durationMin;
      }
    },
    [markers],
  );

  // ─── UPDATE STATS ON GPS UPDATE ──────────────────────────────────
  useEffect(() => {
    if (!selectedJeepney) return;

    const channel = supabase
      .channel(`dispatcher_gps_${selectedJeepney.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
          filter: `jeepney_id=eq.${selectedJeepney.id}`,
        },
        (payload) => {
          const newLoc = payload.new;
          // Update marker position (already handled by useDispatcherGPS)
          // Also update stats
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
        },
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [selectedJeepney]);

  // ─── SEND ALERT ──────────────────────────────────────────────────
  const sendAlertToDriver = async () => {
    if (!selectedJeepney) return;
    setSendingAlert(true);
    try {
      // Example: send a push notification via Supabase RPC or directly
      // You can use the NotificationService or a custom function
      const { error } = await supabase.rpc("send_driver_alert", {
        driver_id: selectedJeepney.id,
        message: "Please check your route and passenger load.",
      });
      if (error) throw error;
      Alert.alert(
        "Alert Sent",
        `Notification sent to ${selectedJeepney.driverName}`,
      );
    } catch (err) {
      console.error("Failed to send alert:", err);
      Alert.alert("Error", "Could not send alert. Please try again.");
    } finally {
      setSendingAlert(false);
    }
  };

  const viewDetails = () => {
    if (!selectedJeepney) return;
    Alert.alert(
      "Jeepney Details",
      `Plate: ${selectedJeepney.plateNumber}\nDriver: ${selectedJeepney.driverName}\nStatus: ${selectedJeepney.status}\nOccupancy: ${selectedJeepney.occupancy}/${selectedJeepney.capacity}\nSpeed: ${speed !== null ? Math.round(speed) : "?"} km/h\nDistance to Terminal: ${distance !== null ? distance.toFixed(1) : "?"} km\nETA: ${eta !== null ? eta : "?"} min`,
    );
  };

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
          Loading fleet...
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
          padding: 20,
          backgroundColor: lightTheme.background,
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
          onPress={fetchMarkers}
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
            Fleet Tracking
          </Text>
          <TouchableOpacity
            onPress={fetchMarkers}
            style={{
              padding: 6,
              borderRadius: 20,
              backgroundColor: lightTheme.surfaceSecondary,
              marginRight: 6,
            }}
          >
            <RefreshCw size={20} color={lightTheme.text.primary} />
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
          enableRealtime={true}
        />
      </View>

      {/* Bottom Panel */}
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

          {/* Selected Jeepney Info */}
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
                Selected Jeepney
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: lightTheme.text.primary,
                }}
              >
                {selectedJeepney?.plateNumber || "None selected"}
              </Text>
              <Text style={{ fontSize: 12, color: lightTheme.text.muted }}>
                {selectedJeepney
                  ? `${selectedJeepney.driverName} · ${selectedJeepney.status}`
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
            <StatusPill
              status={
                selectedJeepney?.status === "en_route" ? "online" : "idle"
              }
              dot
            />
          </View>

          {/* Stats Grid (Speed, Distance, ETA) */}
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
                {speed !== null ? `${Math.round(speed)} km/h` : "—"}
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
                {distance !== null ? `${distance.toFixed(1)} km` : "—"}
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
                {eta !== null ? `${eta} min` : "—"}
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

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              style={{
                flex: 1,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={sendAlertToDriver}
              disabled={!selectedJeepney || sendingAlert}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Bell size={20} color="white" style={{ marginRight: 8 }} />
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "600" }}
                >
                  {sendingAlert ? "Sending..." : "Send Alert"}
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
              onPress={viewDetails}
              disabled={!selectedJeepney}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Users
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
                  Details
                </Text>
              </View>
            </Button>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
