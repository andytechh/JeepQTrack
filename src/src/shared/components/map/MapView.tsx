import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import {
  getActiveMapMarkers,
  JeepneyMarker,
  useGPSMap,
} from "../../hooks/useGPSMap";

import MapControls from "./MapControls";
import { getMapHTML } from "./mapHTML";

export interface JeepneyETA {
  jeepneyId: string;

  currentLat: number;
  currentLng: number;

  destinationName: string;

  progressPercent: number;

  totalRouteDistanceKm: number;

  remainingDistanceKm: number;

  traveledDistanceKm: number;

  currentSpeedKmh: number;

  travelMinutes: number;

  additionalMinutes: number;

  remainingMinutes: number;

  estimatedArrivalTime: string;

  currentTime: string;
}

interface MapViewProps {
  markers: JeepneyMarker[];

  onMarkerPress?: (jeepneyId: string) => void;

  onJeepneyETA?: (eta: JeepneyETA) => void;

  /**
   * Fires once the road route resolves - either from OSRM
   * (approximate: false) or the straight-line fallback
   * (approximate: true).
   */
  onRouteStatus?: (status: {
    ready: boolean;
    approximate?: boolean;
    error?: string;
  }) => void;

  showControls?: boolean;

  enableRealtime?: boolean;

  style?: any;
}

export const MapView: React.FC<MapViewProps> = ({
  markers,
  onMarkerPress,
  onJeepneyETA,
  onRouteStatus,
  showControls = true,
  enableRealtime = true,
  style,
}) => {
  /**
   * ============================================================
   * ACTIVE MAP MARKERS
   * ============================================================
   *
   * Only active jeepneys are allowed to reach the map.
   */
  const activeMarkers = React.useMemo(() => {
    return getActiveMapMarkers(markers);
  }, [markers]);

  /**
   * ============================================================
   * GPS MAP
   * ============================================================
   */
  const {
    webViewRef,
    mapReady,
    handleMessage,
    zoomIn,
    zoomOut,
    recenter,
    refreshRoute,
  } = useGPSMap({
    markers: activeMarkers,
    enableRealtime,

    /**
     * Extra safety check before allowing a marker selection.
     */
    onMarkerPress: (jeepneyId) => {
      const jeepney = activeMarkers.find((marker) => marker.id === jeepneyId);

      if (!jeepney) {
        console.log(
          "🚫 Ignoring marker press for inactive/unknown jeepney:",
          jeepneyId,
        );

        return;
      }

      onMarkerPress?.(jeepneyId);
    },
  });

  /**
   * ============================================================
   * WEBVIEW MESSAGE HANDLER
   * ============================================================
   */
  const handleWebViewMessage = React.useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        console.log("🗺️ MAP EVENT:", data.type, data);

        /**
         * ====================================================
         * ROUTE STATUS
         * ====================================================
         */
        if (data.type === "routeReady" && onRouteStatus) {
          onRouteStatus({
            ready: true,
            approximate: Boolean(data.approximate),
          });
        }

        if (data.type === "routeError" && onRouteStatus) {
          onRouteStatus({
            ready: false,
            error: data.message ?? "Unknown route error",
          });
        }

        /**
         * ====================================================
         * ETA UPDATE
         * ====================================================
         */
        if (data.type === "etaUpdate" && onJeepneyETA) {
          /**
           * Only accept ETA updates for jeepneys that
           * are currently active.
           */
          const jeepney = activeMarkers.find(
            (marker) => marker.id === data.jeepneyId,
          );

          if (!jeepney) {
            console.log(
              "🚫 Ignoring ETA for inactive/unknown jeepney:",
              data.jeepneyId,
            );

            return;
          }

          onJeepneyETA({
            jeepneyId: data.jeepneyId,

            currentLat: Number(data.currentLat),

            currentLng: Number(data.currentLng),

            destinationName: data.destinationName ?? "Destination",

            progressPercent: Number(data.progressPercent ?? 0),

            totalRouteDistanceKm: Number(data.totalRouteDistanceKm ?? 0),

            remainingDistanceKm: Number(data.remainingDistanceKm ?? 0),

            traveledDistanceKm: Number(data.traveledDistanceKm ?? 0),

            currentSpeedKmh: Number(data.currentSpeedKmh ?? 0),

            travelMinutes: Number(data.travelMinutes ?? 0),

            additionalMinutes: Number(data.additionalMinutes ?? 20),

            remainingMinutes: Number(data.remainingMinutes ?? 0),

            estimatedArrivalTime: data.estimatedArrivalTime ?? "--",

            currentTime: data.currentTime ?? new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn("⚠️ Failed to process map message:", error);
      }

      /**
       * Let useGPSMap process its own events.
       */
      handleMessage(event);
    },
    [activeMarkers, handleMessage, onJeepneyETA, onRouteStatus],
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{
          html: getMapHTML(),
        }}
        onMessage={handleWebViewMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={["*"]}
        startInLoadingState={true}
        cacheEnabled={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0EA5E9" />

            <Text style={styles.loadingText}>
              Loading Donsol–Daraga route...
            </Text>
          </View>
        )}
      />

      {showControls && (
        <MapControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRecenter={() => {
            /**
             * Only use an active jeepney
             * when recentering.
             */
            const first = activeMarkers[0];

            if (first) {
              recenter(first.lat, first.lng);
            } else {
              /**
               * No active jeepneys.
               * Center on the Donsol–Daraga
               * route instead.
               */
              recenter(13.025, 123.65);
            }
          }}
          onShowTerminals={() => {
            recenter(13.025, 123.65);
          }}
          onRefreshRoute={refreshRoute}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 1,
  },

  webview: {
    flex: 1,
    backgroundColor: "#E0F2FE",
  },

  loading: {
    ...StyleSheet.absoluteFill,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#F0F9FF",
  },

  loadingText: {
    marginTop: 12,

    color: "#64748B",

    fontSize: 13,

    fontWeight: "600",
  },
});
