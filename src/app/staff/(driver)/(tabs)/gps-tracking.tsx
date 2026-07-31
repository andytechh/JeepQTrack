// app/staff/(driver)/gps-tracking.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  MapPin,
  RefreshCw,
  Target,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../../../../src/shared/config/supabase";

const { width, height } = Dimensions.get("window");

// ─── CONSTANTS ──────────────────────────────────────────────────────
const DONSOL_TERMINAL = {
  id: "donsol",
  name: "Donsol Terminal",
  latitude: 12.9032,
  longitude: 123.59425,
};

const DARAGA_TERMINAL = {
  id: "daraga",
  name: "Daraga Terminal",
  latitude: 13.14769,
  longitude: 123.71216,
};

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

// ─── HTML MAP WITH OSRM ROUTING ──────────────────────────────────
const getMapHTML = () => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #0a1628; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-tile-pane {
      filter: brightness(0.9) invert(0.1) hue-rotate(180deg);
    }
    .leaflet-popup-content {
      color: #0a1628;
      font-size: 12px;
      font-weight: 600;
    }
    .leaflet-popup-content strong {
      color: #0ea5e9;
    }
    .custom-div-icon {
      background: transparent;
      border: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script>
    // ─── INIT MAP ──────────────────────────────────────────────────
    const map = L.map('map', {
      center: [13.0, 123.65],
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    });

    // ─── OPENSTREETMAP TILES ──────────────────────────────────────
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // ─── TERMINALS ──────────────────────────────────────────────────
    const terminals = [
      { lat: 12.9032, lng: 123.59425, name: 'Donsol Terminal', type: 'origin' },
      { lat: 13.14769, lng: 123.71216, name: 'Daraga Terminal', type: 'destination' }
    ];

    // ─── CUSTOM ICONS ──────────────────────────────────────────────
    const originIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background:#22c55e;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.5);">🚌</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const destIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background:#f59e0b;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.5);">📍</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // ─── ADD TERMINALS ──────────────────────────────────────────────
    terminals.forEach(t => {
      const icon = t.type === 'origin' ? originIcon : destIcon;
      const popupContent = \`
        <div style="text-align:center;padding:4px;">
          <strong>\${t.name}</strong><br>
          <span style="color:\${t.type === 'origin' ? '#22c55e' : '#f59e0b'};font-size:10px;">
            \${t.type === 'origin' ? '📍 ORIGIN' : '🏁 DESTINATION'}
          </span>
        </div>
      \`;
      L.marker([t.lat, t.lng], { icon })
        .addTo(map)
        .bindPopup(popupContent);
    });

    // ─── FETCH REAL ROAD ROUTE FROM OSRM ──────────────────────────
    let routeLayer = null;

    async function fetchRealRoute() {
      try {
        const url = \`https://router.project-osrm.org/route/v1/driving/\${terminals[0].lng},\${terminals[0].lat};\${terminals[1].lng},\${terminals[1].lat}?overview=full&geometries=geojson\`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
          
          // Remove old route if exists
          if (routeLayer) {
            map.removeLayer(routeLayer);
          }
          
          // Add new route
          routeLayer = L.polyline(latLngs, {
            color: '#38bdf8',
            weight: 4,
            opacity: 0.6,
            dashArray: '8, 8'
          }).addTo(map);
          
          // Fit bounds to show the entire route
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds, { padding: [50, 50] });
          
          console.log('✅ Real route loaded');
        }
      } catch (error) {
        console.error('❌ Route fetch error:', error);
        // Fallback to straight line
        addStraightLine();
      }
    }

    function addStraightLine() {
      const points = [
        [terminals[0].lat, terminals[0].lng],
        [terminals[1].lat, terminals[1].lng]
      ];
      routeLayer = L.polyline(points, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.6,
        dashArray: '8, 8'
      }).addTo(map);
    }

    // Fetch real route when map loads
    setTimeout(() => {
      fetchRealRoute();
    }, 1000);

    // ─── JEEPNEY MARKERS ─────────────────────────────────────────────
    let markers = {};

    function getStatusColor(status) {
      const colors = {
        'en_route': '#22c55e',
        'waiting': '#f59e0b',
        'loading': '#38bdf8',
        'arrived': '#8b5cf6'
      };
      return colors[status] || '#94a3b8';
    }

    function getStatusLabel(status) {
      const labels = {
        'en_route': 'En Route',
        'waiting': 'Waiting',
        'loading': 'Loading',
        'arrived': 'Arrived'
      };
      return labels[status] || status || 'Unknown';
    }

    function addJeepneyMarker(id, lat, lng, plateNumber, status, occupancy, capacity, driver) {
      // Remove existing marker if any
      if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }

      const color = getStatusColor(status);
      const label = getStatusLabel(status);

      const jeepneyIcon = L.divIcon({
        className: 'custom-div-icon',
        html: \`
          <div style="
            background: rgba(14,165,233,0.3);
            width:44px;
            height:44px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            border:3px solid \${color};
            box-shadow:0 4px 16px rgba(0,0,0,0.5);
            transition: all 0.3s;
          ">
            <span style="font-size:22px;">🚐</span>
          </div>
        \`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const popupContent = \`
        <div style="padding:8px;min-width:140px;">
          <strong style="color:#0ea5e9;font-size:14px;">\${plateNumber}</strong><br>
          <span style="color:\${color};font-size:11px;">● \${label}</span><br>
          <span style="color:#64748b;font-size:10px;">
            👤 \${occupancy || 0}/\${capacity || 24}
          </span><br>
          <span style="color:#64748b;font-size:10px;">
            🚗 \${driver || 'Unknown'}
          </span>
        </div>
      \`;

      const marker = L.marker([lat, lng], { icon: jeepneyIcon })
        .addTo(map)
        .bindPopup(popupContent);

      markers[id] = marker;
    }

    function updateJeepneyMarker(id, lat, lng) {
      if (markers[id]) {
        markers[id].setLatLng([lat, lng]);
      }
    }

    // ─── HANDLE REACT NATIVE MESSAGES ──────────────────────────────
    document.addEventListener('message', function(e) {
      try {
        const data = JSON.parse(e.data);
        console.log('📱 Received:', data.type);

        if (data.type === 'updateMarkers') {
          // Clear all existing markers
          Object.keys(markers).forEach(key => {
            map.removeLayer(markers[key]);
            delete markers[key];
          });

          // Add new markers
          data.markers.forEach(j => {
            addJeepneyMarker(
              j.id,
              j.lat,
              j.lng,
              j.plate_number,
              j.status,
              j.current_occupancy,
              j.capacity,
              j.driver_name
            );
          });
        }

        if (data.type === 'updateJeepney') {
          updateJeepneyMarker(data.id, data.lat, data.lng);
        }

        if (data.type === 'centerMap') {
          if (data.lat && data.lng) {
            map.flyTo([data.lat, data.lng], 14);
          }
        }

        if (data.type === 'refreshRoute') {
          fetchRealRoute();
        }

      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // ─── TELL REACT NATIVE MAP IS READY ──────────────────────────────
    setTimeout(() => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapReady'
      }));
    }, 1000);

    console.log('✅ Map initialized with OpenStreetMap + OSRM routing');
  </script>
</body>
</html>
  `;
};

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
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const isMounted = useRef(true);
  const subscriptionRef = useRef<any>(null);

  // ─── FETCH DATA ────────────────────────────────────────────────────
  // ─── FETCH DATA ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setError(null);

      // 🔥 Get latest GPS from tracking table
      const { data: gpsData, error: gpsError } = await supabase
        .from("gps_tracking")
        .select(
          `
        jeepney_id,
        latitude,
        longitude,
        recorded_at,
        speed,
        jeepneys:jeepney_id (
          id,
          plate_number,
          status,
          current_occupancy,
          capacity,
          queue_position,
          driver_name
        )
      `,
        )
        .order("recorded_at", { ascending: false })
        .limit(50); // Get last 50 GPS records

      if (gpsError) {
        console.error("Error fetching GPS:", gpsError);
        setError(`Failed to fetch GPS: ${gpsError.message}`);
        return;
      }

      if (!gpsData || gpsData.length === 0) {
        setOnlineJeepneys([]);
        setDebugInfo("No GPS data - waiting for jeepneys");
        setLoading(false);
        return;
      }

      // Get unique jeepneys with latest GPS
      const jeepneyMap = new Map();
      gpsData.forEach((record: any) => {
        if (!jeepneyMap.has(record.jeepney_id) && record.jeepneys) {
          jeepneyMap.set(record.jeepney_id, {
            id: record.jeepney_id,
            plate_number: record.jeepneys.plate_number,
            status: record.jeepneys.status || "en_route",
            current_occupancy: record.jeepneys.current_occupancy || 0,
            capacity: record.jeepneys.capacity || 24,
            queue_position: record.jeepneys.queue_position || 0,
            latitude: record.latitude,
            longitude: record.longitude,
            last_location_update: record.recorded_at,
            driver_name: record.jeepneys.driver_name || "Unknown",
            speed: record.speed,
          });
        }
      });

      const processedJeepneys = Array.from(jeepneyMap.values());
      console.log("📍 Active jeepneys:", processedJeepneys.length);
      setDebugInfo(`${processedJeepneys.length} active`);

      setOnlineJeepneys(processedJeepneys);
      setLastUpdate(new Date().toISOString());

      if (mapReady) {
        updateMap(processedJeepneys);
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
  }, [mapReady]);
  // ─── UPDATE MAP ──────────────────────────────────────────────────
  const updateMap = (jeepneys: OnlineJeepney[]) => {
    if (!webViewRef.current || !mapReady) return;

    const markers = jeepneys
      .filter((j) => j.latitude && j.longitude)
      .map((j) => ({
        id: j.id,
        lat: j.latitude,
        lng: j.longitude,
        plate_number: j.plate_number,
        status: j.status,
        current_occupancy: j.current_occupancy,
        capacity: j.capacity,
        driver_name: j.driver_name || "Unknown",
      }));

    webViewRef.current.postMessage(
      JSON.stringify({
        type: "updateMarkers",
        markers: markers,
      }),
    );
  };

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

          // Update individual jeepney on map (real-time)
          if (webViewRef.current && mapReady) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: "updateJeepney",
                id: newLocation.jeepney_id,
                lat: newLocation.latitude,
                lng: newLocation.longitude,
              }),
            );
          }
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
  }, [mapReady]);

  // ─── INITIAL LOAD ──────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // NO interval - only updates via Supabase subscriptions

    return () => {
      isMounted.current = false;
    };
  }, []);

  // ─── HANDLE WEBVIEW MESSAGES ──────────────────────────────────
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("📱 Message from WebView:", data.type);

      if (data.type === "mapReady") {
        setMapReady(true);
        // Send initial data after map is ready
        setTimeout(() => {
          updateMap(onlineJeepneys);
        }, 500);
      }
    } catch (error) {
      console.error("Error handling WebView message:", error);
    }
  };

  // ─── ACTIONS ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    // Also refresh the route
    if (webViewRef.current && mapReady) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "refreshRoute",
        }),
      );
    }
    setRefreshing(false);
  };

  const handleCenterMap = () => {
    if (
      webViewRef.current &&
      selectedJeepney?.latitude &&
      selectedJeepney?.longitude
    ) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "centerMap",
          lat: selectedJeepney.latitude,
          lng: selectedJeepney.longitude,
        }),
      );
    } else if (onlineJeepneys.length > 0) {
      const first = onlineJeepneys[0];
      if (first.latitude && first.longitude) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "centerMap",
            lat: first.latitude,
            lng: first.longitude,
          }),
        );
      }
    }
  };

  const handleShowTerminals = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "centerMap",
          lat: (12.9032 + 13.14769) / 2,
          lng: (123.59425 + 123.71216) / 2,
        }),
      );
    }
  };

  const handleSelectJeepney = (jeepney: OnlineJeepney) => {
    setSelectedJeepney(jeepney);
    if (webViewRef.current && jeepney.latitude && jeepney.longitude) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "centerMap",
          lat: jeepney.latitude,
          lng: jeepney.longitude,
        }),
      );
    }
  };

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
        <WebView
          ref={webViewRef}
          source={{ html: getMapHTML() }}
          style={{ flex: 1 }}
          onMessage={handleMessage}
          onError={(error) => {
            console.error("❌ WebView error:", error);
            setError("Failed to load map");
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          startInLoadingState={true}
          renderLoading={() => (
            <View className="absolute inset-0 items-center justify-center bg-[#0a1628]">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="mt-4 text-white/60">Loading map...</Text>
            </View>
          )}
        />

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
              backgroundColor: refreshing
                ? "rgba(14,165,233,0.3)"
                : "rgba(15, 23, 42, 0.9)",
              borderWidth: 1,
              borderColor: refreshing
                ? "rgba(14,165,233,0.4)"
                : "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={20}
              color={refreshing ? "#38bdf8" : "#94a3b8"}
              style={refreshing ? { transform: [{ rotate: "360deg" }] } : {}}
            />
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
              }}
            />
            <Text style={{ color: "white", fontSize: 9 }}>Real Road Route</Text>
          </View>
        </View>

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
              {selectedJeepney.speed && (
                <Text className="text-white/40 text-xs">
                  Speed: {Math.round(selectedJeepney.speed)} km/h
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/60 text-xs">
                {onlineJeepneys.length} jeepney
                {onlineJeepneys.length !== 1 ? "s" : ""} online
              </Text>
              <Text className="text-white/30 text-xs mt-1">
                Donsol → Daraga (Real road route)
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white/40 text-xs">
                {lastUpdate
                  ? `Updated ${formatTimeAgo(lastUpdate)}`
                  : "No data"}
              </Text>
              <Text className="text-white/20 text-xs mt-1">
                Real-time updates
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
