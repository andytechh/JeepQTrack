// app/staff/(driver)/gps-tracking.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  MapPin,
  Navigation,
  RefreshCw,
  Target,
  WifiOff
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  UrlTile,
} from "react-native-maps";
import { supabase } from "../../../src/shared/config/supabase";

const { width, height } = Dimensions.get("window");

// ─── CONSTANTS ──────────────────────────────────────────────────────
const DONSOL_TERMINAL = {
  id: "donsol",
  name: "Donsol Terminal",
  latitude: 12.9032,
  longitude: 123.59425,
  radius: 50,
};

const DARAGA_TERMINAL = {
  id: "daraga",
  name: "Daraga Terminal",
  latitude: 13.14769,
  longitude: 123.71216,
  radius: 50,
};

const TERMINALS = [DONSOL_TERMINAL, DARAGA_TERMINAL];

// ─── TYPES ──────────────────────────────────────────────────────────
interface OnlineJeepney {
  id: string;
  plate_number: string;
  status: string;
  current_occupancy: number;
  capacity: number;
  queue_position: number;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
  driver_name?: string;
  driver_id?: string;
  speed?: number;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────
export default function GPSTrackingScreen() {
  // ─── State ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineJeepneys, setOnlineJeepneys] = useState<OnlineJeepney[]>([]);
  const [selectedJeepney, setSelectedJeepney] = useState<OnlineJeepney | null>(
    null,
  );
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [followMode, setFollowMode] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [routePoints, setRoutePoints] = useState<any[]>([]);

  const mapRef = useRef<MapView>(null);
  const isMounted = useRef(true);
  const subscriptionRef = useRef<any>(null);

  const [mapRegion, setMapRegion] = useState({
    latitude: (DONSOL_TERMINAL.latitude + DARAGA_TERMINAL.latitude) / 2,
    longitude: (DONSOL_TERMINAL.longitude + DARAGA_TERMINAL.longitude) / 2,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  // ─── GENERATE ROUTE ──────────────────────────────────────────────
  const generateRoute = () => {
    const points = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      points.push({
        latitude:
          DONSOL_TERMINAL.latitude +
          (DARAGA_TERMINAL.latitude - DONSOL_TERMINAL.latitude) * fraction,
        longitude:
          DONSOL_TERMINAL.longitude +
          (DARAGA_TERMINAL.longitude - DONSOL_TERMINAL.longitude) * fraction,
      });
    }
    setRoutePoints(points);
  };

  // ─── FETCH DATA ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setLoading(true);
      setError(null);

      const { data: jeepneys, error: jeepneyError } = await supabase.from(
        "jeepneys",
      ).select(`
          id,
          plate_number,
          status,
          current_occupancy,
          capacity,
          queue_position,
          latitude,
          longitude,
          last_location_update,
          driver_name
        `);

      if (jeepneyError) {
        console.error("Error fetching jeepneys:", jeepneyError);
        setError(`Failed to fetch jeepneys: ${jeepneyError.message}`);
        return;
      }

      console.log("📊 Total jeepneys found:", jeepneys?.length || 0);
      setDebugInfo(`Found ${jeepneys?.length || 0} jeepneys`);

      if (!jeepneys || jeepneys.length === 0) {
        setOnlineJeepneys([]);
        setLoading(false);
        return;
      }

      // Filter jeepneys with location data
      const jeepneysWithLocation = jeepneys.filter(
        (j: any) => j.latitude !== null && j.longitude !== null,
      );

      let processedJeepneys = jeepneysWithLocation.map((j: any) => ({
        ...j,
        driver_name: j.driver_name || "Unknown",
      }));

      // If no GPS, show at terminals
      if (processedJeepneys.length === 0 && jeepneys.length > 0) {
        setDebugInfo("No GPS data - showing jeepneys at terminals");
        processedJeepneys = jeepneys.map((j: any, index: number) => ({
          ...j,
          latitude:
            index % 2 === 0
              ? DONSOL_TERMINAL.latitude + (Math.random() - 0.5) * 0.002
              : DARAGA_TERMINAL.latitude + (Math.random() - 0.5) * 0.002,
          longitude:
            index % 2 === 0
              ? DONSOL_TERMINAL.longitude + (Math.random() - 0.5) * 0.002
              : DARAGA_TERMINAL.longitude + (Math.random() - 0.5) * 0.002,
          driver_name: "Unknown",
        }));
      }

      setOnlineJeepneys(processedJeepneys);
      generateRoute();
      setLastUpdate(new Date().toISOString());

      if (processedJeepneys.length > 0) {
        const first = processedJeepneys[0];
        if (first.latitude && first.longitude) {
          setMapRegion({
            latitude: first.latitude,
            longitude: first.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setError(error.message || "Failed to load data");
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // ─── REAL-TIME SUBSCRIPTION ──────────────────────────────────────
  useEffect(() => {
    const statusChannel = supabase
      .channel("online_jeepneys")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          fetchData();
        },
      )
      .subscribe();

    const gpsChannel = supabase
      .channel("gps_tracking_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        async (payload) => {
          const newLocation = payload.new;
          setOnlineJeepneys((prev) =>
            prev.map((j) =>
              j.id === newLocation.jeepney_id
                ? {
                    ...j,
                    latitude: newLocation.latitude,
                    longitude: newLocation.longitude,
                    last_location_update: newLocation.recorded_at,
                    speed: newLocation.speed,
                  }
                : j,
            ),
          );
          setLastUpdate(newLocation.recorded_at);
        },
      )
      .subscribe();

    subscriptionRef.current = { statusChannel, gpsChannel };

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.statusChannel.unsubscribe();
        subscriptionRef.current.gpsChannel.unsubscribe();
      }
    };
  }, []);

  // ─── INITIAL LOAD ──────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  // ─── ACTIONS ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleCenterMap = () => {
    if (
      selectedJeepney?.latitude &&
      selectedJeepney?.longitude &&
      mapRef.current
    ) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedJeepney.latitude,
          longitude: selectedJeepney.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        1000,
      );
    } else if (onlineJeepneys.length > 0) {
      const first = onlineJeepneys[0];
      if (first.latitude && first.longitude) {
        mapRef.current?.animateToRegion(
          {
            latitude: first.latitude,
            longitude: first.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          },
          1000,
        );
      }
    }
  };

  const handleShowTerminals = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: (DONSOL_TERMINAL.latitude + DARAGA_TERMINAL.latitude) / 2,
          longitude:
            (DONSOL_TERMINAL.longitude + DARAGA_TERMINAL.longitude) / 2,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        },
        1000,
      );
    }
  };

  const handleSelectJeepney = (jeepney: OnlineJeepney) => {
    setSelectedJeepney(jeepney);
    if (mapRef.current && jeepney.latitude && jeepney.longitude) {
      mapRef.current.animateToRegion(
        {
          latitude: jeepney.latitude,
          longitude: jeepney.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        1000,
      );
    }
  };

  const handleToggleRoute = () => setShowRoute((prev) => !prev);
  const handleToggleFollow = () => setFollowMode((prev) => !prev);

  // ─── FORMAT HELPERS ───────────────────────────────────────────────
  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return "No data";
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_route":
        return "#22c55e";
      case "waiting":
        return "#f59e0b";
      case "loading":
        return "#38bdf8";
      case "arrived":
        return "#8b5cf6";
      default:
        return "#94a3b8";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_route":
        return "En Route";
      case "waiting":
        return "Waiting";
      case "loading":
        return "Loading";
      case "arrived":
        return "Arrived";
      default:
        return status || "Unknown";
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-white/60">Loading online jeepneys...</Text>
        <Text className="mt-2 text-white/30 text-xs">{debugInfo}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a1628] p-4">
        <AlertCircle size={48} color="#f87171" />
        <Text className="text-red-400 text-lg font-semibold mt-4 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-[#0ea5e9] px-6 py-2.5 rounded-xl"
          onPress={handleRefresh}
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628]">
      {/* Header */}
      <LinearGradient
        colors={["#0c4a6e", "#0a1628"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-4 pt-4 pb-3 flex-row items-center"
      >
        <TouchableOpacity
          className="p-2 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold ml-3 flex-1">
          Live Tracking
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor:
              onlineJeepneys.length > 0
                ? "rgba(34,197,94,0.15)"
                : "rgba(239,68,68,0.15)",
            borderRadius: 20,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor:
              onlineJeepneys.length > 0
                ? "rgba(34,197,94,0.2)"
                : "rgba(239,68,68,0.2)",
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                onlineJeepneys.length > 0 ? "#22c55e" : "#ef4444",
            }}
          />
          <Text
            style={{
              color: onlineJeepneys.length > 0 ? "#4ade80" : "#f87171",
              fontSize: 10,
              fontWeight: "600",
            }}
          >
            {onlineJeepneys.length > 0
              ? `${onlineJeepneys.length} ONLINE`
              : "NO JEEPNEYS"}
          </Text>
        </View>
      </LinearGradient>

      {/* Map */}
      <View style={{ flex: 1, position: "relative" }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          region={mapRegion}
          provider={PROVIDER_DEFAULT}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          mapType="standard"
          userInterfaceStyle="dark"
          onMapReady={() => {
            console.log("✅ Map ready");
            setMapReady(true);
          }}
          onError={(e) => {
            console.error("❌ Map error:", e);
          }}
        >
          {/* OpenStreetMap Tiles - FREE! */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            zIndex={1}
          />

          {/* Route Line */}
          {showRoute && routePoints.length > 0 && (
            <Polyline
              coordinates={routePoints}
              strokeWidth={3}
              strokeColor="rgba(14, 165, 233, 0.3)"
              lineDashPattern={[5, 5]}
              zIndex={2}
            />
          )}

          {/* Terminals */}
          {TERMINALS.map((terminal) => (
            <React.Fragment key={terminal.id}>
              <Circle
                center={{
                  latitude: terminal.latitude,
                  longitude: terminal.longitude,
                }}
                radius={terminal.radius}
                strokeWidth={2}
                strokeColor={terminal.id === "donsol" ? "#22c55e" : "#f59e0b"}
                fillColor={
                  terminal.id === "donsol"
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(251,191,36,0.1)"
                }
                zIndex={0}
              />
              <Marker
                coordinate={{
                  latitude: terminal.latitude,
                  longitude: terminal.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={1}
              >
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor:
                        terminal.id === "donsol"
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(251,191,36,0.2)",
                      borderWidth: 3,
                      borderColor:
                        terminal.id === "donsol" ? "#22c55e" : "#f59e0b",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>
                      {terminal.id === "donsol" ? "🚌" : "📍"}
                    </Text>
                  </View>
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: "rgba(15,23,42,0.9)",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {terminal.name}
                    </Text>
                    <Text
                      style={{
                        color: terminal.id === "donsol" ? "#4ade80" : "#fbbf24",
                        fontSize: 8,
                        textAlign: "center",
                      }}
                    >
                      {terminal.id === "donsol"
                        ? "📍 ORIGIN"
                        : "🏁 DESTINATION"}
                    </Text>
                  </View>
                </View>
              </Marker>
            </React.Fragment>
          ))}

          {/* Jeepneys */}
          {onlineJeepneys.map((jeepney) => {
            if (!jeepney.latitude || !jeepney.longitude) return null;

            const isSelected = selectedJeepney?.id === jeepney.id;
            const statusColor = getStatusColor(jeepney.status);

            return (
              <Marker
                key={jeepney.id}
                coordinate={{
                  latitude: jeepney.latitude,
                  longitude: jeepney.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => handleSelectJeepney(jeepney)}
                zIndex={3}
              >
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: isSelected ? 56 : 44,
                      height: isSelected ? 56 : 44,
                      borderRadius: isSelected ? 28 : 22,
                      backgroundColor: isSelected
                        ? "rgba(14,165,233,0.4)"
                        : "rgba(14,165,233,0.25)",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 3,
                      borderColor: isSelected ? "#38bdf8" : statusColor,
                      shadowColor: statusColor,
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                      elevation: 5,
                    }}
                  >
                    <Bus
                      size={isSelected ? 24 : 18}
                      color={isSelected ? "#38bdf8" : statusColor}
                    />
                  </View>
                  {isSelected && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: -20,
                        backgroundColor: "rgba(15,23,42,0.95)",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 8,
                          fontWeight: "600",
                        }}
                      >
                        {jeepney.plate_number}
                      </Text>
                    </View>
                  )}
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* No Jeepneys Overlay */}
        {onlineJeepneys.length === 0 && !loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(10, 22, 40, 0.7)",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderRadius: 24,
                padding: 24,
                alignItems: "center",
                maxWidth: 300,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <WifiOff size={48} color="#64748b" />
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "bold",
                  marginTop: 12,
                }}
              >
                No Jeepneys Available
              </Text>
              <Text
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {debugInfo || "No jeepneys found in the system."}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  backgroundColor: "#0ea5e9",
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
                onPress={handleRefresh}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Controls */}
        <View
          style={{
            position: "absolute",
            right: 16,
            bottom: 180,
            gap: 8,
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleCenterMap}
          >
            <Target size={20} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleShowTerminals}
          >
            <MapPin size={20} color="#f59e0b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: showRoute
                ? "rgba(14,165,233,0.3)"
                : "rgba(15, 23, 42, 0.9)",
              borderWidth: 1,
              borderColor: showRoute
                ? "rgba(14,165,233,0.4)"
                : "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleToggleRoute}
          >
            <Navigation size={20} color={showRoute ? "#38bdf8" : "white"} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View
          style={{
            position: "absolute",
            left: 16,
            bottom: 180,
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.05)",
            zIndex: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: 12,
                height: 3,
                backgroundColor: "#22c55e",
                borderRadius: 2,
              }}
            />
            <Text style={{ color: "white", fontSize: 9 }}>Origin (Donsol)</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: 12,
                height: 3,
                backgroundColor: "#f59e0b",
                borderRadius: 2,
              }}
            />
            <Text style={{ color: "white", fontSize: 9 }}>
              Destination (Daraga)
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 3,
                backgroundColor: "#38bdf8",
                borderRadius: 2,
                borderStyle: "dashed",
              }}
            />
            <Text style={{ color: "white", fontSize: 9 }}>Route Path</Text>
          </View>
        </View>
      </View>

      {/* Bottom Panel */}
      <View
        style={{
          backgroundColor: "rgba(10, 22, 40, 0.95)",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
          padding: 16,
          paddingBottom: 24,
        }}
      >
        {selectedJeepney ? (
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <Bus size={16} color={getStatusColor(selectedJeepney.status)} />
                <Text className="text-white font-bold text-sm">
                  {selectedJeepney.plate_number}
                </Text>
                <View
                  style={{
                    backgroundColor: `${getStatusColor(selectedJeepney.status)}20`,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: getStatusColor(selectedJeepney.status),
                      fontSize: 9,
                      fontWeight: "600",
                    }}
                  >
                    {getStatusLabel(selectedJeepney.status)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedJeepney(null)}>
                <Text className="text-white/40 text-xs">Deselect</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-4 flex-wrap">
              <Text className="text-white/40 text-xs">
                Driver: {selectedJeepney.driver_name || "Unknown"}
              </Text>
              <Text className="text-white/40 text-xs">
                Occupancy: {selectedJeepney.current_occupancy || 0}/
                {selectedJeepney.capacity || 24}
              </Text>
              <Text className="text-white/40 text-xs">
                Updated: {formatTimeAgo(selectedJeepney.last_location_update)}
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <Text className="text-white/60 text-xs">
              {onlineJeepneys.length} jeepney
              {onlineJeepneys.length !== 1 ? "s" : ""} online
            </Text>
            <View className="items-end">
              <Text className="text-white/40 text-xs">
                {lastUpdate
                  ? `Updated ${formatTimeAgo(lastUpdate)}`
                  : "No data"}
              </Text>
              <TouchableOpacity onPress={handleRefresh} className="mt-1">
                <RefreshCw size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
