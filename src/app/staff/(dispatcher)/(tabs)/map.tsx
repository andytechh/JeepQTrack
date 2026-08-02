import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Send,
  Users
} from "lucide-react-native";
import { useCallback, useState } from "react";
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
import { lightTheme, theme } from "@/src/shared/constants/theme";
import { useDispatcherGPS } from "@/src/shared/hooks/useDispatcherGPS";
import { JeepneyMarker } from "@/src/shared/hooks/useGPSMap";

export default function DispatcherGPSTrackingScreen() {
  const { markers, loading, error, fetchMarkers } = useDispatcherGPS();
  const [selectedJeepney, setSelectedJeepney] = useState<JeepneyMarker | null>(
    null,
  );
  const [dispatching, setDispatching] = useState(false);

  const handleMarkerPress = useCallback(
    (jeepneyId: string) => {
      const jeep = markers.find((m) => m.id === jeepneyId);
      if (jeep) setSelectedJeepney(jeep);
    },
    [markers],
  );

  const handleDispatch = () => {
    if (!selectedJeepney) return;
    Alert.alert(
      "Dispatch Jeepney",
      `Send ${selectedJeepney.plateNumber} to a new trip?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Dispatch",
          onPress: async () => {
            setDispatching(true);
            // TODO: Call Supabase to assign a new trip
            Alert.alert(
              "Dispatched",
              `${selectedJeepney.plateNumber} is on the way.`,
            );
            setDispatching(false);
          },
        },
      ],
    );
  };

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

          <View
            style={{
              height: 1,
              backgroundColor: lightTheme.border,
              marginBottom: 12,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: lightTheme.text.muted }}>Actions</Text>
          </View>

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
              onPress={handleDispatch}
              disabled={!selectedJeepney || dispatching}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Send size={20} color="white" style={{ marginRight: 8 }} />
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "600" }}
                >
                  {dispatching ? "Dispatching..." : "Dispatch"}
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
              onPress={() => {
                if (selectedJeepney) {
                  // Navigate to jeepney details or chat with driver
                  Alert.alert(
                    "Info",
                    `Details for ${selectedJeepney.plateNumber}`,
                  );
                }
              }}
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
